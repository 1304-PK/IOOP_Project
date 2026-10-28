// ambulance fleet management

static const string AMB_FILE = "data/ambulances.txt";
static const int    HOSPITAL_CITY_ID = 0;

// ambulance

enum class AmbulanceStatus { AVAILABLE, DISPATCHED };

static string ambStatusToStr(AmbulanceStatus s) {
    return (s == AmbulanceStatus::AVAILABLE) ? "AVAILABLE" : "DISPATCHED";
}
static AmbulanceStatus strToAmbStatus(const string& s) {
    return (s == "DISPATCHED") ? AmbulanceStatus::DISPATCHED
                                : AmbulanceStatus::AVAILABLE;
}

class Ambulance {
    string          id;
    AmbulanceStatus status;
    int             currentCityId;
    string          assignedEmergencyId;
    string          capabilities;   // advanced life support capabilities

public:
    Ambulance() : status(AmbulanceStatus::AVAILABLE),
                  currentCityId(HOSPITAL_CITY_ID) {}

    Ambulance(const string& id, AmbulanceStatus status, int cityId,
              const string& assignedEmergId, const string& caps)
        : id(id), status(status), currentCityId(cityId),
          assignedEmergencyId(assignedEmergId),
          capabilities(caps) {}

    const string& getId()                  const { return id; }
    AmbulanceStatus getStatus()            const { return status; }
    int             getCurrentCityId()     const { return currentCityId; }
    const string&   getAssignedEmergencyId() const { return assignedEmergencyId; }
    const string&   getCapabilities()      const { return capabilities; }
    bool            isAvailable()          const { return status == AmbulanceStatus::AVAILABLE; }

    void dispatch(const string& emergId, int destCityId) {
        status              = AmbulanceStatus::DISPATCHED;
        assignedEmergencyId = emergId;
        currentCityId       = destCityId;
    }

    void returnToHospital() {
        status              = AmbulanceStatus::AVAILABLE;
        assignedEmergencyId = "";
        currentCityId       = HOSPITAL_CITY_ID;
    }

    // id|status|currentCityId|assignedEmergId|capabilities
    string serialize() const {
        return id + DELIM + ambStatusToStr(status) + DELIM +
               to_string(currentCityId) + DELIM +
               (assignedEmergencyId.empty() ? "NONE" : assignedEmergencyId) + DELIM +
               capabilities;
    }
};

// ambulance manager

class AmbulanceManager {
    map<string, Ambulance> fleet;  // id -> ambulance

public:
    AmbulanceManager() {}

    // load from file
    void load() {
        ensureFile(AMB_FILE);
        fleet.clear();
        for (auto& line : readLines(AMB_FILE)) {
            auto tok = split(line);
            if (tok.size() < 5) continue;
            int cityId = 0;
            try { cityId = stoi(tok[2]); } catch(...) {}
            string assignedEmerg = (tok[3] == "NONE") ? "" : tok[3];
            fleet.emplace(tok[0],
                Ambulance(tok[0], strToAmbStatus(tok[1]),
                          cityId, assignedEmerg, tok[4]));
        }
    }

    // save to file
    void save() const {
        vector<string> lines;
        for (const auto& pair : fleet)
            lines.push_back(pair.second.serialize());
        writeLines(AMB_FILE, lines);
    }

    // initialize fleet on first run
    void initFleet() {
        if (!fleet.empty()) return;
        for (int i = 1; i <= 10; ++i) {
            ostringstream oss;
            oss << "AMB" << setw(3) << setfill('0') << i;
            string id = oss.str();
            fleet.emplace(id,
                Ambulance(id, AmbulanceStatus::AVAILABLE, HOSPITAL_CITY_ID, "", "ALS"));
        }
        save();
    }

    // get first available ambulance
    Ambulance* getAvailable() {
        for (auto& pair : fleet)
            if (pair.second.isAvailable()) return &pair.second;
        return nullptr;
    }

    // dispatch ambulance
    bool dispatch(const string& ambId, const string& emergId, int destCityId) {
        auto it = fleet.find(ambId);
        if (it == fleet.end() || !it->second.isAvailable()) return false;
        it->second.dispatch(emergId, destCityId);
        save();
        return true;
    }

    // complete mission and return ambulance
    bool completeMission(const string& ambId) {
        auto it = fleet.find(ambId);
        if (it == fleet.end()) return false;
        it->second.returnToHospital();
        save();
        return true;
    }

    // counts
    int countAvailable() const {
        int n = 0;
        for (const auto& pair : fleet) if (pair.second.isAvailable()) ++n;
        return n;
    }
    int countDispatched() const { return (int)fleet.size() - countAvailable(); }

    const map<string, Ambulance>& getFleet() const { return fleet; }

    Ambulance* getById(const string& id) {
        auto it = fleet.find(id);
        return (it != fleet.end()) ? &it->second : nullptr;
    }

    // display
    void display(const Graph& g) const {
        cout << "\n";
        cout << left
             << setw(8)  << "ID"
             << setw(14) << "Status"
             << setw(24) << "Current City"
             << setw(14) << "Assigned Emg"
             << setw(8)  << "Caps"
             << "\n";
        cout << string(68, '-') << "\n";
        for (const auto& pair : fleet) {
            const string& id = pair.first;
            const Ambulance& a = pair.second;
            cout << setw(8)  << id
                 << setw(24) << (a.isAvailable()
                                 ? "Available (Hospital)"
                                 : ambStatusToStr(a.getStatus()))
                 << setw(24) << g.cityName(a.getCurrentCityId())
                 << setw(14) << (a.getAssignedEmergencyId().empty()
                                 ? "-"
                                 : a.getAssignedEmergencyId())
                 << setw(8)  << a.getCapabilities()
                 << "\n";
        }
        cout << "\n  Available: " << countAvailable()
             << "  |  Dispatched: " << countDispatched() << "\n";
    }
};
