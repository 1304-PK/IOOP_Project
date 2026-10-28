// user models and auth service

enum class Role { PATIENT, DOCTOR, ADMIN };

static string roleToStr(Role r) {
    if (r == Role::DOCTOR) return "DOCTOR";
    if (r == Role::ADMIN)  return "ADMIN";
    return "PATIENT";
}
static Role strToRole(const string& s) {
    if (s == "DOCTOR") return Role::DOCTOR;
    if (s == "ADMIN")  return Role::ADMIN;
    return Role::PATIENT;
}

// user base class
class User {
protected:
    string id;
    string username;
    string passwordHash;
    Role   role;
    string name;

public:
    User() : role(Role::PATIENT) {}
    User(string id_, string username_, string passwordHash_,
         Role role_, string name_)
        : id(id_), username(username_), passwordHash(passwordHash_),
          role(role_), name(name_) {}
    virtual ~User() {}

    const string& getId()           const { return id; }
    const string& getUsername()     const { return username; }
    const string& getPasswordHash() const { return passwordHash; }
    Role           getRole()        const { return role; }
    const string& getName()         const { return name; }
    void setName(const string& n)         { name = n; }

    virtual void displayProfile() const {
        cout << "  ID       : " << id             << "\n"
             << "  Username : " << username       << "\n"
             << "  Name     : " << name           << "\n"
             << "  Role     : " << roleToStr(role) << "\n";
    }

    virtual string serialize() const {
        return id + DELIM + username + DELIM + passwordHash + DELIM +
               roleToStr(role) + DELIM + name;
    }
};

// patient class
class Patient : public User {
    string phone;
    string address;
    int    cityId;
    string registeredAt;

public:
    Patient() : User(), cityId(0) {}
    Patient(string id_, string username_, string passwordHash_,
            string name_, string phone_, string address_,
            int cityId_, string registeredAt_)
        : User(id_, username_, passwordHash_, Role::PATIENT, name_),
          phone(phone_), address(address_),
          cityId(cityId_), registeredAt(registeredAt_) {}

    const string& getPhone()   const { return phone; }
    const string& getAddress() const { return address; }
    int           getCityId()  const { return cityId; }
    void setCityId(int c)            { cityId = c; }
    void setPhone(const string& p)   { phone = p; }
    void setAddress(const string& a) { address = a; }

    void displayProfile() const {
        User::displayProfile();
        cout << "  Phone    : " << phone        << "\n"
             << "  Address  : " << address      << "\n"
             << "  City ID  : " << cityId       << "\n"
             << "  Joined   : " << registeredAt << "\n";
    }

    // id|username|hash|PATIENT|name|phone|address|cityId|registeredAt
    string serialize() const {
        return User::serialize() + DELIM + phone + DELIM + address +
               DELIM + to_string(cityId) + DELIM + registeredAt;
    }
};

// doctor class
enum class DoctorType { SPECIALIST, EMERGENCY_PHYSICIAN };

static string doctorTypeToStr(DoctorType t) {
    return (t == DoctorType::SPECIALIST) ? "SPECIALIST" : "EMERGENCY_PHYSICIAN";
}
static DoctorType strToDoctorType(const string& s) {
    return (s == "EMERGENCY_PHYSICIAN") ? DoctorType::EMERGENCY_PHYSICIAN
                                        : DoctorType::SPECIALIST;
}

class Doctor : public User {
    string     specialization;
    DoctorType doctorType;
    bool       available;
    string     assignedEmergencyId;
    map<string, string> bookedSlots;  // "date|time" -> appt id

public:
    Doctor() : User(), doctorType(DoctorType::SPECIALIST), available(true) {}

    Doctor(string id_, string username_, string passwordHash_,
           string name_, string specialization_, DoctorType dtype_)
        : User(id_, username_, passwordHash_, Role::DOCTOR, name_),
          specialization(specialization_), doctorType(dtype_), available(true) {}

    const string& getSpecialization()      const { return specialization; }
    DoctorType    getDoctorType()          const { return doctorType; }
    bool          isAvailable()            const { return available; }
    const string& getAssignedEmergencyId() const { return assignedEmergencyId; }
    bool isEmergencyPhysician()            const {
        return doctorType == DoctorType::EMERGENCY_PHYSICIAN;
    }

    void setAvailable(bool a)                   { available = a; }
    void setAssignedEmergency(const string& eid){ assignedEmergencyId = eid; }
    void clearAssignment()                      { assignedEmergencyId = ""; available = true; }

    bool isSlotBooked(const string& date, const string& time) const {
        return bookedSlots.count(date + DELIM + time) > 0;
    }
    void bookSlot(const string& date, const string& time, const string& apptId) {
        bookedSlots[date + DELIM + time] = apptId;
    }
    void freeSlot(const string& date, const string& time) {
        bookedSlots.erase(date + DELIM + time);
    }
    const map<string,string>& getBookedSlots() const { return bookedSlots; }

    string slotsToString() const {
        string s;
        for (const auto& p : bookedSlots) {
            if (!s.empty()) s += ";";
            s += p.first + ":" + p.second;
        }
        return s;
    }

    void loadSlotsFromString(const string& s) {
        bookedSlots.clear();
        if (s.empty() || s == "NONE") return;
        istringstream ss(s);
        string entry;
        while (getline(ss, entry, ';')) {
            size_t colonPos = entry.rfind(':');
            if (colonPos == string::npos) continue;
            string key    = entry.substr(0, colonPos);
            string apptId = entry.substr(colonPos + 1);
            bookedSlots[key] = apptId;
        }
    }

    void displayProfile() const {
        User::displayProfile();
        cout << "  Specialization : " << specialization          << "\n"
             << "  Type           : " << doctorTypeToStr(doctorType) << "\n"
             << "  Available      : " << (available ? "Yes" : "No") << "\n";
        if (!assignedEmergencyId.empty())
            cout << "  Assigned to    : " << assignedEmergencyId << "\n";
    }

    void displaySchedule() const {
        if (bookedSlots.empty()) { cout << "  No booked appointments.\n"; return; }
        cout << left << setw(14) << "Date"
             << setw(10) << "Time"
             << setw(14) << "Appt ID" << "\n";
        cout << string(38, '-') << "\n";
        for (const auto& p : bookedSlots) {
            vector<string> parts = split(p.first);
            string date = parts.size() > 0 ? parts[0] : p.first;
            string time = parts.size() > 1 ? parts[1] : "";
            cout << setw(14) << date << setw(10) << time
                 << setw(14) << p.second << "\n";
        }
    }

    // id|username|hash|DOCTOR|name|spec|type|available|assignedEmergId|slots
    string serialize() const {
        string slots = slotsToString();
        return User::serialize() + DELIM + specialization + DELIM +
               doctorTypeToStr(doctorType) + DELIM +
               (available ? "1" : "0") + DELIM +
               (assignedEmergencyId.empty() ? "NONE" : assignedEmergencyId) + DELIM +
               (slots.empty() ? "NONE" : slots);
    }
};

// admin class
class Admin : public User {
public:
    Admin() : User() {}
    Admin(string id_, string username_, string passwordHash_, string name_)
        : User(id_, username_, passwordHash_, Role::ADMIN, name_) {}

    void displayProfile() const {
        User::displayProfile();
        cout << "  System Administrator\n";
    }
};

// auth service
static const string USERS_FILE = "data/users.txt";
static const string DOCS_FILE  = "data/doctors.txt";

class AuthService {
    map<string, User*>   usersById;
    map<string, string>  usernameToId;
    map<string, Doctor*> doctorsById;

public:
    AuthService() {}
    ~AuthService() {
        for (auto& p : usersById)
            delete p.second;
    }

    void loadAll() {
        ensureFile(USERS_FILE);
        ensureFile(DOCS_FILE);

        // load patients and admins
        vector<string> lines = readLines(USERS_FILE);
        for (size_t i = 0; i < lines.size(); ++i) {
            vector<string> tok = split(lines[i]);
            if (tok.size() < 5) continue;
            Role role = strToRole(tok[3]);

            if (role == Role::PATIENT && tok.size() >= 9) {
                int cityId = 0;
                try { cityId = stoi(tok[7]); } catch(...) {}
                Patient* p = new Patient(tok[0],tok[1],tok[2],
                                         tok[4],tok[5],tok[6],
                                         cityId, tok[8]);
                usersById[p->getId()]          = p;
                usernameToId[p->getUsername()] = p->getId();
            } else if (role == Role::ADMIN) {
                Admin* a = new Admin(tok[0],tok[1],tok[2],tok[4]);
                usersById[a->getId()]          = a;
                usernameToId[a->getUsername()] = a->getId();
            }
        }

        // load doctors
        vector<string> dlines = readLines(DOCS_FILE);
        for (size_t i = 0; i < dlines.size(); ++i) {
            vector<string> tok = split(dlines[i]);
            if (tok.size() < 10) continue;
            bool avail = (tok[7] == "1");
            string assignedEmerg = (tok[8] == "NONE") ? "" : tok[8];

            Doctor* d = new Doctor(tok[0],tok[1],tok[2],tok[4],
                                   tok[5], strToDoctorType(tok[6]));
            d->setAvailable(avail);
            if (!assignedEmerg.empty()) d->setAssignedEmergency(assignedEmerg);
            d->loadSlotsFromString(tok[9]);

            usersById[d->getId()]          = d;
            usernameToId[d->getUsername()] = d->getId();
            doctorsById[d->getId()]        = d;
        }
    }

    void saveAll() {
        vector<string> userLines, doctorLines;
        for (const auto& p : usersById) {
            if (p.second->getRole() == Role::DOCTOR)
                doctorLines.push_back(p.second->serialize());
            else
                userLines.push_back(p.second->serialize());
        }
        writeLines(USERS_FILE, userLines);
        writeLines(DOCS_FILE, doctorLines);
    }

    string registerPatient(const string& username, const string& password,
                           const string& name, const string& phone,
                           const string& address, int cityId) {
        if (username.empty() || password.empty() || name.empty())
            return "Username, password, and name are required.";
        if (password.size() < 6)
            return "Password must be at least 6 characters.";
        if (usernameToId.count(username))
            return "Username '" + username + "' is already taken.";

        string id   = genId("PAT", USERS_FILE);
        string hash = hashPassword(password);
        Patient* p  = new Patient(id, username, hash, name,
                                  phone, address, cityId, nowTimestamp());
        usersById[id]          = p;
        usernameToId[username] = id;
        appendLine(USERS_FILE, p->serialize());
        return "";
    }

    bool adminExists() const {
        for (const auto& p : usersById)
            if (p.second->getRole() == Role::ADMIN) return true;
        return false;
    }

    void createAdmin(const string& username, const string& password,
                     const string& name) {
        string hash = hashPassword(password);
        Admin* a    = new Admin("ADM001", username, hash, name);
        usersById[a->getId()]          = a;
        usernameToId[a->getUsername()] = a->getId();
        appendLine(USERS_FILE, a->serialize());
    }

    string createDoctor(const string& username, const string& password,
                        const string& name, const string& specialization,
                        DoctorType dtype) {
        if (usernameToId.count(username))
            return "Username '" + username + "' already exists.";
        string id   = genId("DOC", DOCS_FILE);
        string hash = hashPassword(password);
        Doctor* d   = new Doctor(id, username, hash, name, specialization, dtype);
        usersById[id]          = d;
        usernameToId[username] = id;
        doctorsById[id]        = d;
        appendLine(DOCS_FILE, d->serialize());
        return "";
    }

    User* login(const string& username, const string& password) {
        auto it = usernameToId.find(username);
        if (it == usernameToId.end()) return nullptr;
        User* u = usersById[it->second];
        if (!verifyPassword(password, u->getPasswordHash())) return nullptr;
        return u;
    }

    User* getUserById(const string& id) const {
        auto it = usersById.find(id);
        return (it != usersById.end()) ? it->second : nullptr;
    }
    Doctor* getDoctorById(const string& id) const {
        auto it = doctorsById.find(id);
        return (it != doctorsById.end()) ? it->second : nullptr;
    }
    Patient* getPatientById(const string& id) const {
        auto it = usersById.find(id);
        if (it == usersById.end() || it->second->getRole() != Role::PATIENT)
            return nullptr;
        return dynamic_cast<Patient*>(it->second);
    }

    vector<Doctor*> getDoctorsBySpecialization(const string& spec) const {
        vector<Doctor*> result;
        for (const auto& p : doctorsById)
            if (p.second->getSpecialization() == spec &&
                !p.second->isEmergencyPhysician())
                result.push_back(p.second);
        return result;
    }

    vector<Doctor*> getEmergencyPhysicians() const {
        vector<Doctor*> result;
        for (const auto& p : doctorsById)
            if (p.second->isEmergencyPhysician())
                result.push_back(p.second);
        return result;
    }

    vector<Doctor*> getAllDoctors() const {
        vector<Doctor*> result;
        for (const auto& p : doctorsById)
            result.push_back(p.second);
        return result;
    }

    vector<Patient*> getAllPatients() const {
        vector<Patient*> result;
        for (const auto& p : usersById)
            if (p.second->getRole() == Role::PATIENT)
                result.push_back(dynamic_cast<Patient*>(p.second));
        return result;
    }

    void saveDoctor(Doctor* /*d*/) {
        vector<string> lines;
        for (const auto& p : doctorsById)
            lines.push_back(p.second->serialize());
        writeLines(DOCS_FILE, lines);
    }

    void seedSampleDoctors() {
        if (!doctorsById.empty()) return;

        struct SeedDoc {
            string user, pass, name, spec;
            DoctorType type;
        };
        SeedDoc seeds[] = {
            {"dr.hart",    "Doc@1234", "Dr. Aiden Hart",    "Cardiology",       DoctorType::SPECIALIST},
            {"dr.sharma",  "Doc@1234", "Dr. Priya Sharma",  "Cardiology",       DoctorType::SPECIALIST},
            {"dr.chen",    "Doc@1234", "Dr. Marcus Chen",   "Neurology",        DoctorType::SPECIALIST},
            {"dr.patel",   "Doc@1234", "Dr. Sofia Patel",   "Neurology",        DoctorType::SPECIALIST},
            {"dr.wilson",  "Doc@1234", "Dr. James Wilson",  "Orthopedics",      DoctorType::SPECIALIST},
            {"dr.russo",   "Doc@1234", "Dr. Elena Russo",   "Orthopedics",      DoctorType::SPECIALIST},
            {"dr.kim",     "Doc@1234", "Dr. Sarah Kim",     "Pediatrics",       DoctorType::SPECIALIST},
            {"dr.johnson", "Doc@1234", "Dr. David Johnson", "Pediatrics",       DoctorType::SPECIALIST},
            {"dr.gupta",   "Doc@1234", "Dr. Raj Gupta",     "General Medicine", DoctorType::SPECIALIST},
            {"dr.carter",  "Doc@1234", "Dr. Emily Carter",  "General Medicine", DoctorType::SPECIALIST},
            {"dr.rivera",  "EP@1234",  "Dr. Alex Rivera",   "Emergency",        DoctorType::EMERGENCY_PHYSICIAN},
            {"dr.lee",     "EP@1234",  "Dr. Morgan Lee",    "Emergency",        DoctorType::EMERGENCY_PHYSICIAN},
            {"dr.brooks",  "EP@1234",  "Dr. Taylor Brooks", "Emergency",        DoctorType::EMERGENCY_PHYSICIAN},
            {"dr.davis",   "EP@1234",  "Dr. Jordan Davis",  "Emergency",        DoctorType::EMERGENCY_PHYSICIAN},
        };
        int n = (int)(sizeof(seeds)/sizeof(seeds[0]));
        for (int i = 0; i < n; ++i)
            if (!usernameToId.count(seeds[i].user))
                createDoctor(seeds[i].user, seeds[i].pass,
                             seeds[i].name, seeds[i].spec, seeds[i].type);
    }
};
