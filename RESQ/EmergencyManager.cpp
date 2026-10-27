// ============================================================
//  EmergencyManager.cpp  –  Emergency priority queue + dispatch
//  Included by main.cpp (unity build).  Do NOT compile alone.
// ============================================================

static const string EMG_FILE = "data/emergencies.txt";

// ==================== Emergency status =======================

enum class EmergencyStatus {
    PENDING, DISPATCHED, COMPLETED, CANCELLED
};

static string emgStatusToStr(EmergencyStatus s) {
    switch(s) {
        case EmergencyStatus::PENDING:    return "PENDING";
        case EmergencyStatus::DISPATCHED: return "DISPATCHED";
        case EmergencyStatus::COMPLETED:  return "COMPLETED";
        case EmergencyStatus::CANCELLED:  return "CANCELLED";
    }
    return "PENDING";
}
static EmergencyStatus strToEmgStatus(const string& s) {
    if (s == "DISPATCHED") return EmergencyStatus::DISPATCHED;
    if (s == "COMPLETED")  return EmergencyStatus::COMPLETED;
    if (s == "CANCELLED")  return EmergencyStatus::CANCELLED;
    return EmergencyStatus::PENDING;
}

// ==================== Severity ===============================

enum class Severity { CRITICAL = 1, HIGH = 2, MODERATE = 3, LOW = 4 };

static string severityToStr(Severity s) {
    switch(s) {
        case Severity::CRITICAL: return "CRITICAL";
        case Severity::HIGH:     return "HIGH";
        case Severity::MODERATE: return "MODERATE";
        case Severity::LOW:      return "LOW";
    }
    return "LOW";
}
static Severity strToSeverity(const string& s) {
    if (s == "CRITICAL") return Severity::CRITICAL;
    if (s == "HIGH")     return Severity::HIGH;
    if (s == "MODERATE") return Severity::MODERATE;
    return Severity::LOW;
}
static string severityColor(Severity s) {
    switch(s) {
        case Severity::CRITICAL: return "\033[1;31m";  // bold red
        case Severity::HIGH:     return "\033[33m";    // yellow
        case Severity::MODERATE: return "\033[36m";    // cyan
        case Severity::LOW:      return "\033[32m";    // green
    }
    return "\033[0m";
}

// ==================== Emergency ==============================

class Emergency {
    string          id;
    string          patientId;
    int             cityId;
    string          category;
    Severity        severity;
    string          requestTimestamp;
    long long       epochTime;       // for ordering
    long long       seqNum;          // tie-breaker
    string          assignedAmbId;
    string          physician1Id;
    string          physician2Id;
    EmergencyStatus status;
    string          outboundRoute;
    string          returnRoute;
    int             distanceKm;
    string          completedAt;

public:
    Emergency() : cityId(0), severity(Severity::LOW),
                  epochTime(0), seqNum(0), status(EmergencyStatus::PENDING),
                  distanceKm(0) {}

    Emergency(string id, string patientId, int cityId,
              string category, Severity severity,
              string timestamp, long long epoch, long long seq)
        : id(std::move(id)), patientId(std::move(patientId)),
          cityId(cityId), category(std::move(category)),
          severity(severity), requestTimestamp(std::move(timestamp)),
          epochTime(epoch), seqNum(seq),
          status(EmergencyStatus::PENDING), distanceKm(0) {}

    // Getters
    const string& getId()           const { return id; }
    const string& getPatientId()    const { return patientId; }
    int           getCityId()       const { return cityId; }
    const string& getCategory()     const { return category; }
    Severity      getSeverity()     const { return severity; }
    int           getSeverityVal()  const { return (int)severity; }
    const string& getTimestamp()    const { return requestTimestamp; }
    long long     getEpoch()        const { return epochTime; }
    long long     getSeqNum()       const { return seqNum; }
    const string& getAmbId()        const { return assignedAmbId; }
    const string& getPhysician1Id() const { return physician1Id; }
    const string& getPhysician2Id() const { return physician2Id; }
    EmergencyStatus getStatus()     const { return status; }
    const string& getOutRoute()     const { return outboundRoute; }
    const string& getRetRoute()     const { return returnRoute; }
    int           getDistKm()       const { return distanceKm; }

    // Setters
    void setStatus(EmergencyStatus s)    { status = s; }
    void setAmbulance(const string& id)  { assignedAmbId = id; }
    void setPhysicians(const string& p1, const string& p2) {
        physician1Id = p1; physician2Id = p2;
    }
    void setRoutes(const string& out, const string& ret, int km) {
        outboundRoute = out; returnRoute = ret; distanceKm = km;
    }
    void setCompletedAt(const string& ts) { completedAt = ts; }
    const string& getCompletedAt() const  { return completedAt; }

    // ---- Serialize -----------------------------------------
    // id|patId|cityId|category|severity|timestamp|epoch|seq|
    //   ambId|phy1Id|phy2Id|status|outRoute|retRoute|distKm|completedAt
    string serialize() const {
        auto orNull = [](const string& s) { return s.empty() ? "NONE" : s; };
        return id + DELIM + patientId + DELIM + to_string(cityId) + DELIM +
               category + DELIM + severityToStr(severity) + DELIM +
               requestTimestamp + DELIM + to_string(epochTime) + DELIM +
               to_string(seqNum) + DELIM +
               orNull(assignedAmbId) + DELIM +
               orNull(physician1Id) + DELIM +
               orNull(physician2Id) + DELIM +
               emgStatusToStr(status) + DELIM +
               orNull(outboundRoute) + DELIM +
               orNull(returnRoute) + DELIM +
               to_string(distanceKm) + DELIM +
               orNull(completedAt);
    }

    // ---- Display summary ------------------------------------
    void display(bool colorize = true) const {
        string col  = colorize ? severityColor(severity) : "";
        string rst  = colorize ? "\033[0m" : "";
        cout << "  Emergency ID : " << id << "\n"
             << "  Patient ID   : " << patientId << "\n"
             << "  City ID      : " << cityId << "\n"
             << "  Category     : " << category << "\n"
             << "  Severity     : " << col << severityToStr(severity) << rst << "\n"
             << "  Status       : " << emgStatusToStr(status) << "\n"
             << "  Requested    : " << requestTimestamp << "\n";
        if (!assignedAmbId.empty())
            cout << "  Ambulance    : " << assignedAmbId << "\n";
        if (!physician1Id.empty())
            cout << "  Physicians   : " << physician1Id << " , " << physician2Id << "\n";
        if (!outboundRoute.empty())
            cout << "  Route (out)  : " << outboundRoute << " (" << distanceKm << " km)\n"
                 << "  Route (ret)  : " << returnRoute   << "\n";
        if (!completedAt.empty())
            cout << "  Completed    : " << completedAt << "\n";
    }
};

// ==================== Priority Queue Comparator ==============

struct EmergencyComparator {
    // Returns true if a has LOWER priority than b
    // (std::priority_queue pops highest priority = top element)
    bool operator()(const Emergency* a, const Emergency* b) const {
        // Lower severity value = higher priority
        if (a->getSeverityVal() != b->getSeverityVal())
            return a->getSeverityVal() > b->getSeverityVal();
        // Equal severity: earlier request = higher priority
        if (a->getEpoch() != b->getEpoch())
            return a->getEpoch() > b->getEpoch();
        // Equal timestamp: lower sequence = earlier = higher priority
        return a->getSeqNum() > b->getSeqNum();
    }
};

// ==================== EmergencyManager =======================

class EmergencyManager {
    // All emergencies loaded from file (owned)
    map<string, Emergency*> allEmergencies;

    // In-memory pending priority queue (pointers into allEmergencies)
    priority_queue<Emergency*, vector<Emergency*>, EmergencyComparator> pendingQueue;

    long long nextSeq = 1;

public:
    EmergencyManager() {}
    ~EmergencyManager() {
        for (auto& pair : allEmergencies) delete pair.second;
    }

    // ---- Load from file -------------------------------------
    void load() {
        ensureFile(EMG_FILE);
        allEmergencies.clear();
        // Clear queue
        pendingQueue = priority_queue<Emergency*, vector<Emergency*>, EmergencyComparator>();

        for (auto& line : readLines(EMG_FILE)) {
            auto tok = split(line);
            if (tok.size() < 16) continue;

            Emergency* e = new Emergency();
            // Parse
            string eid = tok[0];
            long long epoch = 0, seq = 0;
            int cityId = 0, distKm = 0;
            try {
                cityId = stoi(tok[2]);
                epoch  = stoll(tok[6]);
                seq    = stoll(tok[7]);
                distKm = stoi(tok[14]);
            } catch(...) {}

            *e = Emergency(tok[0], tok[1], cityId, tok[3],
                           strToSeverity(tok[4]), tok[5], epoch, seq);

            auto noneOrEmpty = [](const string& s) { return s == "NONE" ? "" : s; };

            e->setAmbulance(noneOrEmpty(tok[8]));
            e->setPhysicians(noneOrEmpty(tok[9]), noneOrEmpty(tok[10]));
            e->setStatus(strToEmgStatus(tok[11]));
            string outR = noneOrEmpty(tok[12]);
            string retR = noneOrEmpty(tok[13]);
            e->setRoutes(outR, retR, distKm);
            if (tok.size() > 15) e->setCompletedAt(noneOrEmpty(tok[15]));

            allEmergencies[eid] = e;
            if (seq >= nextSeq) nextSeq = seq + 1;

            // Re-enqueue pending emergencies
            if (e->getStatus() == EmergencyStatus::PENDING)
                pendingQueue.push(e);
        }
    }

    // ---- Save all ------------------------------------------
    void saveAll() const {
        vector<string> lines;
        for (const auto& pair : allEmergencies)
            lines.push_back(pair.second->serialize());
        writeLines(EMG_FILE, lines);
    }

    // ---- Save single emergency (update in file) ------------
    void saveOne(Emergency* e) {
        // Replace the line for this emergency in the file
        auto lines = readLines(EMG_FILE);
        bool found = false;
        for (auto& line : lines) {
            auto tok = split(line);
            if (!tok.empty() && tok[0] == e->getId()) {
                line  = e->serialize();
                found = true;
            }
        }
        if (!found) lines.push_back(e->serialize());
        writeLines(EMG_FILE, lines);
    }

    // ---- Submit a new emergency -----------------------------
    Emergency* submit(const string& patientId, int cityId,
                      const string& category, Severity severity) {
        string id = genId("EMG", EMG_FILE);
        long long ep  = nowEpoch();
        long long seq = nextSeq++;
        Emergency* e  = new Emergency(id, patientId, cityId, category,
                                      severity, nowTimestamp(), ep, seq);
        allEmergencies[id] = e;
        pendingQueue.push(e);
        saveOne(e);
        return e;
    }

    // ---- Peek highest-priority pending ---------------------
    Emergency* peekNext() {
        // Pop stale entries (those no longer PENDING)
        while (!pendingQueue.empty()) {
            Emergency* top = pendingQueue.top();
            if (top->getStatus() == EmergencyStatus::PENDING) return top;
            pendingQueue.pop();
        }
        return nullptr;
    }

    // ---- Pop highest-priority pending ----------------------
    Emergency* popNext() {
        while (!pendingQueue.empty()) {
            Emergency* top = pendingQueue.top();
            pendingQueue.pop();
            if (top->getStatus() == EmergencyStatus::PENDING) return top;
        }
        return nullptr;
    }

    // ---- Dispatch an emergency ------------------------------
    // Returns error string or "" on success
    string dispatch(Emergency* e,
                    AmbulanceManager& ambMgr,
                    AuthService& auth,
                    const Graph& graph) {
        if (!e || e->getStatus() != EmergencyStatus::PENDING)
            return "Emergency is not in PENDING state.";

        // Check ambulance availability
        Ambulance* amb = ambMgr.getAvailable();
        if (!amb)
            return "No ambulances available. Emergency remains pending.";

        // Check emergency physician availability (need 2)
        auto eps = auth.getEmergencyPhysicians();
        vector<Doctor*> availEPs;
        for (Doctor* ep : eps)
            if (ep->isAvailable()) availEPs.push_back(ep);

        if ((int)availEPs.size() < 2)
            return "All emergency physicians are occupied. "
                   "New emergency requests remain pending.";

        // Check route
        if (!graph.cityExists(e->getCityId()))
            return "Patient city (ID " + to_string(e->getCityId()) +
                   ") not found in road network.";

        vector<int> outPath = graph.shortestPath(HOSPITAL_CITY_ID, e->getCityId());
        if (outPath.empty())
            return "No route found from hospital to city " +
                   graph.cityName(e->getCityId()) + ". Emergency remains pending.";

        vector<int> retPath = graph.shortestPath(e->getCityId(), HOSPITAL_CITY_ID);
        int dist = graph.shortestDist(HOSPITAL_CITY_ID, e->getCityId());

        // ----- ATOMIC ALLOCATION -----
        // Reserve two EPs
        Doctor* ep1 = availEPs[0];
        Doctor* ep2 = availEPs[1];
        ep1->setAvailable(false);  ep1->setAssignedEmergency(e->getId());
        ep2->setAvailable(false);  ep2->setAssignedEmergency(e->getId());

        // Dispatch ambulance
        ambMgr.dispatch(amb->getId(), e->getId(), e->getCityId());

        // Update emergency
        e->setAmbulance(amb->getId());
        e->setPhysicians(ep1->getId(), ep2->getId());
        e->setRoutes(graph.formatPath(outPath),
                     graph.formatPath(retPath), dist);
        e->setStatus(EmergencyStatus::DISPATCHED);

        // Persist
        auth.saveDoctor(ep1);
        auth.saveDoctor(ep2);
        saveOne(e);

        return "";   // success
    }

    // ---- Complete an active emergency ----------------------
    string complete(const string& emergId,
                    AmbulanceManager& ambMgr,
                    AuthService& auth) {
        auto it = allEmergencies.find(emergId);
        if (it == allEmergencies.end())
            return "Emergency ID '" + emergId + "' not found.";

        Emergency* e = it->second;
        if (e->getStatus() != EmergencyStatus::DISPATCHED)
            return "Emergency '" + emergId + "' is not currently DISPATCHED.";

        // Release ambulance
        if (!e->getAmbId().empty()) ambMgr.completeMission(e->getAmbId());

        // Release physicians
        auto releaseEP = [&](const string& epId) {
            Doctor* ep = auth.getDoctorById(epId);
            if (ep) { ep->clearAssignment(); auth.saveDoctor(ep); }
        };
        releaseEP(e->getPhysician1Id());
        releaseEP(e->getPhysician2Id());

        e->setStatus(EmergencyStatus::COMPLETED);
        e->setCompletedAt(nowTimestamp());
        saveOne(e);
        return "";
    }

    // ---- Lookups -------------------------------------------
    Emergency* getById(const string& id) {
        auto it = allEmergencies.find(id);
        return (it != allEmergencies.end()) ? it->second : nullptr;
    }

    // ---- All emergencies for a patient ---------------------
    vector<Emergency*> getByPatient(const string& patientId) const {
        vector<Emergency*> result;
        for (const auto& pair : allEmergencies)
            if (pair.second->getPatientId() == patientId)
                result.push_back(pair.second);
        return result;
    }

    // ---- All emergencies ------------------------------------
    vector<Emergency*> getAll() const {
        vector<Emergency*> result;
        for (const auto& pair : allEmergencies)
            result.push_back(pair.second);
        return result;
    }

    // ---- Pending queue snapshot (sorted) -------------------
    vector<Emergency*> getPendingSnapshot() {
        // Collect pending, sort by priority
        vector<Emergency*> pending;
        for (const auto& pair : allEmergencies)
            if (pair.second->getStatus() == EmergencyStatus::PENDING)
                pending.push_back(pair.second);
        sort(pending.begin(), pending.end(), [](Emergency* a, Emergency* b) {
            if (a->getSeverityVal() != b->getSeverityVal())
                return a->getSeverityVal() < b->getSeverityVal();
            if (a->getEpoch() != b->getEpoch())
                return a->getEpoch() < b->getEpoch();
            return a->getSeqNum() < b->getSeqNum();
        });
        return pending;
    }

    int pendingCount() {
        return (int)getPendingSnapshot().size();
    }

    // ---- Display priority queue ----------------------------
    void displayPendingQueue(const Graph& g) {
        auto pending = getPendingSnapshot();
        if (pending.empty()) {
            cout << "  No pending emergencies.\n";
            return;
        }
        cout << "\n";
        cout << left
             << setw(4)  << "#"
             << setw(10) << "Emg ID"
             << setw(12) << "Patient"
             << setw(22) << "City"
             << setw(12) << "Category"
             << setw(12) << "Severity"
             << setw(22) << "Requested"
             << "\n";
        cout << string(94, '-') << "\n";
        int rank = 1;
        for (auto* e : pending) {
            string col = severityColor(e->getSeverity());
            string rst = "\033[0m";
            cout << setw(4)  << rank++
                 << setw(10) << e->getId()
                 << setw(12) << e->getPatientId()
                 << setw(22) << g.cityName(e->getCityId())
                 << setw(12) << e->getCategory()
                 << col << setw(12) << severityToStr(e->getSeverity()) << rst
                 << setw(22) << e->getTimestamp()
                 << "\n";
        }
    }

    // ---- Display all emergencies ---------------------------
    void displayAll(const Graph& g) {
        auto all = getAll();
        if (all.empty()) {
            cout << "  No emergency records.\n";
            return;
        }
        cout << "\n";
        cout << left
             << setw(10) << "Emg ID"
             << setw(12) << "Patient"
             << setw(16) << "City"
             << setw(10) << "Severity"
             << setw(14) << "Status"
             << setw(22) << "Requested"
             << "\n";
        cout << string(84, '-') << "\n";
        for (auto* e : all) {
            cout << setw(10) << e->getId()
                 << setw(12) << e->getPatientId()
                 << setw(16) << g.cityName(e->getCityId())
                 << setw(10) << severityToStr(e->getSeverity())
                 << setw(14) << emgStatusToStr(e->getStatus())
                 << setw(22) << e->getTimestamp()
                 << "\n";
        }
    }

    // ---- Display dispatched emergencies --------------------
    void displayDispatched() {
        bool any = false;
        for (const auto& pair : allEmergencies) {
            Emergency* e = pair.second;
            if (e->getStatus() == EmergencyStatus::DISPATCHED) {
                cout << "\n"; e->display(); any = true;
            }
        }
        if (!any) cout << "  No active (dispatched) emergencies.\n";
    }

    // ---- Display EPs status ---------------------------------
    void displayEPStatus(AuthService& auth) {
        auto eps = auth.getEmergencyPhysicians();
        cout << "\n";
        cout << left
             << setw(10) << "EP ID"
             << setw(24) << "Name"
             << setw(14) << "Available"
             << setw(14) << "Assigned Emg"
             << "\n";
        cout << string(62, '-') << "\n";
        int available = 0;
        for (Doctor* ep : eps) {
            string avail = ep->isAvailable() ? "\033[32mYes\033[0m"
                                             : "\033[31mNo\033[0m";
            cout << setw(10) << ep->getId()
                 << setw(24) << ep->getName()
                 << setw(14) << (ep->isAvailable() ? "Yes" : "No")
                 << setw(14) << (ep->getAssignedEmergencyId().empty()
                                 ? "-"
                                 : ep->getAssignedEmergencyId())
                 << "\n";
            if (ep->isAvailable()) ++available;
        }
        cout << "\n  Available EPs: " << available
             << " / " << eps.size() << "  (Need 2 per emergency)\n";
    }
};
