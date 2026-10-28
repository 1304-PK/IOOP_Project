// appointment booking system

static const string APPT_FILE = "data/appointments.txt";

// predefined slots

static const vector<string> APPT_TIMES = {
    "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"
};

static const vector<string> SPECIALIZATIONS = {
    "Cardiology", "Neurology", "Orthopedics",
    "Pediatrics", "General Medicine"
};

// appointment status

enum class ApptStatus {
    PENDING, CONFIRMED, CANCELLED, COMPLETED
};

static string apptStatusToStr(ApptStatus s) {
    switch(s) {
        case ApptStatus::PENDING:    return "PENDING";
        case ApptStatus::CONFIRMED:  return "CONFIRMED";
        case ApptStatus::CANCELLED:  return "CANCELLED";
        case ApptStatus::COMPLETED:  return "COMPLETED";
    }
    return "PENDING";
}
static ApptStatus strToApptStatus(const string& s) {
    if (s == "CONFIRMED")  return ApptStatus::CONFIRMED;
    if (s == "CANCELLED")  return ApptStatus::CANCELLED;
    if (s == "COMPLETED")  return ApptStatus::COMPLETED;
    return ApptStatus::PENDING;
}

// appointment model

class Appointment {
    string     id;
    string     patientId;
    string     doctorId;
    string     specialization;
    string     date;
    string     timeSlot;
    string     reason;
    ApptStatus status;
    string     bookedAt;

public:
    Appointment() : status(ApptStatus::PENDING) {}

    Appointment(const string& id, const string& patientId, const string& doctorId,
                const string& spec, const string& date, const string& time,
                const string& reason, const string& bookedAt)
        : id(id), patientId(patientId), doctorId(doctorId),
          specialization(spec), date(date), timeSlot(time),
          reason(reason), status(ApptStatus::CONFIRMED),
          bookedAt(bookedAt) {}

    // getters
    const string& getId()             const { return id; }
    const string& getPatientId()      const { return patientId; }
    const string& getDoctorId()       const { return doctorId; }
    const string& getSpecialization() const { return specialization; }
    const string& getDate()           const { return date; }
    const string& getTimeSlot()       const { return timeSlot; }
    const string& getReason()         const { return reason; }
    ApptStatus    getStatus()         const { return status; }
    const string& getBookedAt()       const { return bookedAt; }

    void setStatus(ApptStatus s) { status = s; }

    // id|patientId|doctorId|specialization|date|timeSlot|reason|status|bookedAt
    string serialize() const {
        return id + DELIM + patientId + DELIM + doctorId + DELIM +
               specialization + DELIM + date + DELIM + timeSlot + DELIM +
               reason + DELIM + apptStatusToStr(status) + DELIM + bookedAt;
    }

    void display() const {
        cout << "  Appt ID      : " << id             << "\n"
             << "  Doctor ID    : " << doctorId       << "\n"
             << "  Specialization: " << specialization << "\n"
             << "  Date         : " << date           << "\n"
             << "  Time         : " << timeSlot       << "\n"
             << "  Reason       : " << reason         << "\n"
             << "  Status       : " << apptStatusToStr(status) << "\n"
             << "  Booked At    : " << bookedAt       << "\n";
    }
};

// appointment manager

class AppointmentManager {
    map<string, Appointment*> appointments;  // id -> appointment

public:
    AppointmentManager() {}
    ~AppointmentManager() {
        for (auto& pair : appointments) delete pair.second;
    }

    // load from file
    void load(AuthService& auth) {
        ensureFile(APPT_FILE);
        appointments.clear();
        for (auto& line : readLines(APPT_FILE)) {
            auto tok = split(line);
            if (tok.size() < 9) continue;
            Appointment* a = new Appointment(
                tok[0], tok[1], tok[2], tok[3], tok[4],
                tok[5], tok[6], tok[8]);
            a->setStatus(strToApptStatus(tok[7]));
            appointments[tok[0]] = a;

            // restore doctor's booked slot (if confirmed or pending)
            if (a->getStatus() == ApptStatus::CONFIRMED ||
                a->getStatus() == ApptStatus::PENDING) {
                Doctor* d = auth.getDoctorById(a->getDoctorId());
                if (d && !d->isSlotBooked(a->getDate(), a->getTimeSlot()))
                    d->bookSlot(a->getDate(), a->getTimeSlot(), a->getId());
            }
        }
    }

    // save all
    void saveAll() const {
        vector<string> lines;
        for (const auto& pair : appointments)
            lines.push_back(pair.second->serialize());
        writeLines(APPT_FILE, lines);
    }

    // save single appointment
    void saveOne(Appointment* a) {
        auto lines = readLines(APPT_FILE);
        bool found = false;
        for (auto& line : lines) {
            auto tok = split(line);
            if (!tok.empty() && tok[0] == a->getId()) {
                line  = a->serialize();
                found = true;
            }
        }
        if (!found) lines.push_back(a->serialize());
        writeLines(APPT_FILE, lines);
    }

    // list specializations
    void listSpecializations() const {
        cout << "\n  Available Specializations:\n";
        cout << string(32, '-') << "\n";
        for (size_t i = 0; i < SPECIALIZATIONS.size(); ++i)
            cout << "  " << (i+1) << ". " << SPECIALIZATIONS[i] << "\n";
    }

    // list doctors for a specialization
    void listDoctorsForSpec(const string& spec, AuthService& auth) const {
        auto docs = auth.getDoctorsBySpecialization(spec);
        if (docs.empty()) {
            cout << "  No doctors available for " << spec << ".\n";
            return;
        }
        cout << "\n  Doctors in " << spec << ":\n";
        cout << left << setw(10) << "ID" << setw(28) << "Name"
             << setw(12) << "Available" << "\n";
        cout << string(50, '-') << "\n";
        for (Doctor* d : docs)
            cout << setw(10) << d->getId()
                 << setw(28) << d->getName()
                 << setw(12) << (d->isAvailable() ? "Yes" : "No")
                 << "\n";
    }

    // list available slots for a doctor
    void listSlots(Doctor* doc, const string& date) const {
        cout << "\n  Available slots for " << doc->getName()
             << " on " << date << ":\n";
        cout << string(30, '-') << "\n";
        bool any = false;
        for (auto& t : APPT_TIMES) {
            if (!doc->isSlotBooked(date, t)) {
                cout << "    " << t << "\n";
                any = true;
            }
        }
        if (!any) cout << "  All slots are booked for this date.\n";
    }

    // book appointment
    // returns empty string on success, error string on failure
    string book(const string& patientId, Doctor* doc,
                const string& date, const string& time,
                const string& reason) {
        // validate slot
        bool validTime = false;
        for (auto& t : APPT_TIMES) if (t == time) { validTime = true; break; }
        if (!validTime) return "Invalid time slot.";

        if (doc->isEmergencyPhysician())
            return "Emergency physicians cannot take routine appointments.";

        if (doc->isSlotBooked(date, time))
            return "Slot " + time + " on " + date + " is already booked.";

        // check patient overlap (same date and time, any doctor)
        for (const auto& pair : appointments) {
            Appointment* a = pair.second;
            if (a->getPatientId() == patientId &&
                a->getDate()     == date &&
                a->getTimeSlot() == time &&
                a->getStatus()   != ApptStatus::CANCELLED)
                return "You already have an appointment at " + time + " on " + date + ".";
        }

        string id = genId("APT", APPT_FILE);
        Appointment* a = new Appointment(id, patientId, doc->getId(),
                                         doc->getSpecialization(),
                                         date, time, reason, nowTimestamp());
        appointments[id] = a;
        doc->bookSlot(date, time, id);
        saveOne(a);
        return "";   // success
    }

    // cancel appointment
    string cancel(const string& apptId, const string& requesterId,
                  bool isAdmin, AuthService& auth) {
        auto it = appointments.find(apptId);
        if (it == appointments.end())
            return "Appointment '" + apptId + "' not found.";
        Appointment* a = it->second;
        if (!isAdmin && a->getPatientId() != requesterId)
            return "You can only cancel your own appointments.";
        if (a->getStatus() == ApptStatus::CANCELLED)
            return "Appointment is already cancelled.";
        if (a->getStatus() == ApptStatus::COMPLETED)
            return "Completed appointments cannot be cancelled.";

        a->setStatus(ApptStatus::CANCELLED);
        Doctor* d = auth.getDoctorById(a->getDoctorId());
        if (d) {
            d->freeSlot(a->getDate(), a->getTimeSlot());
            auth.saveDoctor(d);
        }
        saveOne(a);
        return "";
    }

    // mark complete (doctor or admin)
    string markComplete(const string& apptId, const string& doctorId,
                        bool isAdmin) {
        auto it = appointments.find(apptId);
        if (it == appointments.end())
            return "Appointment '" + apptId + "' not found.";
        Appointment* a = it->second;
        if (!isAdmin && a->getDoctorId() != doctorId)
            return "You can only update your own appointments.";
        if (a->getStatus() == ApptStatus::CANCELLED)
            return "Cannot complete a cancelled appointment.";
        a->setStatus(ApptStatus::COMPLETED);
        saveOne(a);
        return "";
    }

    // appointments for a patient
    vector<Appointment*> getByPatient(const string& patId) const {
        vector<Appointment*> result;
        for (const auto& pair : appointments)
            if (pair.second->getPatientId() == patId) result.push_back(pair.second);
        return result;
    }

    // appointments for a doctor
    vector<Appointment*> getByDoctor(const string& docId) const {
        vector<Appointment*> result;
        for (const auto& pair : appointments)
            if (pair.second->getDoctorId() == docId) result.push_back(pair.second);
        return result;
    }

    // all appointments
    vector<Appointment*> getAll() const {
        vector<Appointment*> result;
        for (const auto& pair : appointments) result.push_back(pair.second);
        return result;
    }

    // display a list of appointments
    static void displayList(const vector<Appointment*>& list,
                            AuthService& auth,
                            const string& header = "") {
        if (!header.empty())
            cout << "\n  " << header << "\n" << string(80, '-') << "\n";
        if (list.empty()) { cout << "  No appointments found.\n"; return; }
        cout << left
             << setw(10) << "Appt ID"
             << setw(12) << "Patient"
             << setw(12) << "Doctor"
             << setw(18) << "Specialization"
             << setw(14) << "Date"
             << setw(10) << "Time"
             << setw(14) << "Status"
             << "\n";
        cout << string(90, '-') << "\n";
        for (Appointment* a : list) {
            string docName = "-";
            Doctor* d = auth.getDoctorById(a->getDoctorId());
            if (d) docName = d->getName();
            cout << setw(10) << a->getId()
                 << setw(12) << a->getPatientId()
                 << setw(12) << a->getDoctorId()
                 << setw(18) << a->getSpecialization()
                 << setw(14) << a->getDate()
                 << setw(10) << a->getTimeSlot()
                 << setw(14) << apptStatusToStr(a->getStatus())
                 << "\n";
        }
    }

    // display statistics
    void displayStats() const {
        int total = 0, confirmed = 0, cancelled = 0, completed = 0;
        for (const auto& pair : appointments) {
            Appointment* a = pair.second;
            ++total;
            switch(a->getStatus()) {
                case ApptStatus::CONFIRMED:  ++confirmed;  break;
                case ApptStatus::CANCELLED:  ++cancelled;  break;
                case ApptStatus::COMPLETED:  ++completed;  break;
                default: break;
            }
        }
        cout << "  Total Appointments : " << total     << "\n"
             << "  Confirmed          : " << confirmed  << "\n"
             << "  Completed          : " << completed  << "\n"
             << "  Cancelled          : " << cancelled  << "\n";
    }
};
