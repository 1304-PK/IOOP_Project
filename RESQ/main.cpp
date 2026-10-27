// ============================================================
//  main.cpp  –  RESQ Hospital Emergency Dispatch System
//  Unity-build entry point: includes all other .cpp files.
//
//  Build command (Windows + MinGW):
//    g++ -std=c++17 -O2 -o RESQ main.cpp -o RESQ.exe
//  Build command (Linux / macOS):
//    g++ -std=c++17 -O2 -o RESQ main.cpp
//
//  NOTE: Compile ONLY main.cpp.  Do NOT compile the other
//  .cpp files separately — they are included below.
// ============================================================

// -------- Standard library includes (shared by all files) ---
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <map>
#include <unordered_map>
#include <set>
#include <queue>
#include <algorithm>
#include <functional>
#include <iomanip>
#include <chrono>
#include <random>
#include <climits>
#include <cstring>
#include <ctime>
#ifdef _WIN32
#include <conio.h>
#endif
using namespace std;

// -------- Unity-build includes (order matters!) -------------
#include "Graph.cpp"
#include "FileManager.cpp"
#include "AuthService.cpp"
#include "AmbulanceManager.cpp"
#include "EmergencyManager.cpp"
#include "AppointmentManager.cpp"

// ============================================================
//  Global application state
// ============================================================
static Graph             g_graph;
static AuthService       g_auth;
static AmbulanceManager  g_ambMgr;
static EmergencyManager  g_emgMgr;
static AppointmentManager g_apptMgr;

// ============================================================
//  Terminal UI helpers
// ============================================================

static void clearScreen() {
#ifdef _WIN32
    system("cls");
#else
    system("clear");
#endif
}

static void pressEnter() {
    cout << "\n  Press [Enter] to continue...";
    cin.ignore(numeric_limits<streamsize>::max(), '\n');
    cin.get();
}

static void printBanner() {
    cout << "\033[1;36m";   // bold cyan
    cout << "\n";
    cout << "  ╔══════════════════════════════════════════════════════╗\n";
    cout << "  ║        R E S Q  —  Emergency Dispatch System        ║\n";
    cout << "  ║       Hospital Emergency & Appointment Manager      ║\n";
    cout << "  ╚══════════════════════════════════════════════════════╝\n";
    cout << "\033[0m\n";
}

static void printSectionHeader(const string& title) {
    cout << "\n\033[1;33m";   // bold yellow
    cout << "  ┌──────────────────────────────────────────────────┐\n";
    cout << "  │  " << left << setw(48) << title << "│\n";
    cout << "  └──────────────────────────────────────────────────┘\n";
    cout << "\033[0m";
}

static void printError(const string& msg) {
    cout << "\n  \033[1;31m[ERROR] " << msg << "\033[0m\n";
}

static void printSuccess(const string& msg) {
    cout << "\n  \033[1;32m[OK] " << msg << "\033[0m\n";
}

static void printInfo(const string& msg) {
    cout << "\n  \033[36m[INFO] " << msg << "\033[0m\n";
}

static void printMenuOption(int n, const string& text) {
    cout << "  \033[33m[" << n << "]\033[0m " << text << "\n";
}

static string getInput(const string& prompt) {
    cout << "  " << prompt;
    string s;
    getline(cin, s);
    return trim(s);
}

static int getMenuChoice(int min, int max) {
    while (true) {
        string s = getInput("Enter choice: ");
        try {
            int n = stoi(s);
            if (n >= min && n <= max) return n;
        } catch(...) {}
        printError("Please enter a number between " +
                   to_string(min) + " and " + to_string(max) + ".");
    }
}

static bool confirm(const string& msg) {
    string s = getInput(msg + " [y/N]: ");
    return (!s.empty() && (s[0] == 'y' || s[0] == 'Y'));
}

// ============================================================
//  Password input (masked)
// ============================================================
static string getPassword(const string& prompt) {
    cout << "  " << prompt;
    string pw;
#ifdef _WIN32
    char c;
    while ((c = _getch()) != '\r' && c != '\n') {
        if (c == '\b') {
            if (!pw.empty()) { pw.pop_back(); cout << "\b \b"; }
        } else {
            pw += c; cout << '*';
        }
    }
    cout << "\n";
#else
    // POSIX: disable echo
    system("stty -echo");
    getline(cin, pw);
    system("stty echo");
    cout << "\n";
#endif
    return pw;
}

// ============================================================
//  Emergency category / severity selection helpers
// ============================================================

static const vector<string> EMG_CATEGORIES = {
    "Cardiac Arrest", "Stroke", "Trauma", "Fracture",
    "Respiratory Distress", "Burns", "Poisoning", "Other"
};

static Severity selectSeverity() {
    cout << "\n  Select severity:\n";
    cout << "  1. \033[1;31mCRITICAL\033[0m (life-threatening, immediate)\n";
    cout << "  2. \033[33mHIGH\033[0m     (urgent, within 15 min)\n";
    cout << "  3. \033[36mMODERATE\033[0m (serious, within 30 min)\n";
    cout << "  4. \033[32mLOW\033[0m      (non-urgent)\n";
    int c = getMenuChoice(1, 4);
    switch(c) {
        case 1: return Severity::CRITICAL;
        case 2: return Severity::HIGH;
        case 3: return Severity::MODERATE;
        default: return Severity::LOW;
    }
}

static string selectCategory() {
    cout << "\n  Select emergency category:\n";
    for (size_t i = 0; i < EMG_CATEGORIES.size(); ++i)
        printMenuOption((int)i+1, EMG_CATEGORIES[i]);
    int c = getMenuChoice(1, (int)EMG_CATEGORIES.size());
    return EMG_CATEGORIES[c-1];
}

// ============================================================
//  Date utilities
// ============================================================
static string todayDate() {
    time_t t = chrono::system_clock::to_time_t(chrono::system_clock::now());
    struct tm* tmPtr = localtime(&t);
    char buf[12];
    if (tmPtr) strftime(buf, sizeof(buf), "%Y-%m-%d", tmPtr);
    else buf[0] = '\0';
    return string(buf);
}

static bool isValidDate(const string& d) {
    if (d.size() != 10) return false;
    if (d[4] != '-' || d[7] != '-') return false;
    try {
        int y = stoi(d.substr(0,4));
        int m = stoi(d.substr(5,2));
        int dd= stoi(d.substr(8,2));
        return (y >= 2024 && m >= 1 && m <= 12 && dd >= 1 && dd <= 31);
    } catch(...) { return false; }
}

// ============================================================
//  ==================  PATIENT MENU  ========================
// ============================================================

static void patientViewProfile(Patient* pat) {
    printSectionHeader("My Profile");
    pat->displayProfile();
    pressEnter();
}

static void patientBookAppointment(Patient* pat) {
    printSectionHeader("Book Appointment");

    // Step 1: Choose specialization
    g_apptMgr.listSpecializations();
    cout << "\n";
    int specIdx = getMenuChoice(1, (int)SPECIALIZATIONS.size());
    string spec = SPECIALIZATIONS[specIdx - 1];

    // Step 2: List doctors
    g_apptMgr.listDoctorsForSpec(spec, g_auth);
    auto docs = g_auth.getDoctorsBySpecialization(spec);
    if (docs.empty()) { pressEnter(); return; }

    cout << "\n  Enter Doctor ID (or 0 to go back): ";
    string docId = getInput("");
    if (docId == "0") return;
    Doctor* doc = g_auth.getDoctorById(docId);
    if (!doc || doc->getSpecialization() != spec || doc->isEmergencyPhysician()) {
        printError("Invalid doctor ID."); pressEnter(); return;
    }

    // Step 3: Date
    cout << "  Enter appointment date (YYYY-MM-DD, today=" << todayDate() << "): ";
    string date = getInput("");
    if (!isValidDate(date)) {
        printError("Invalid date format."); pressEnter(); return;
    }

    // Step 4: Available slots
    g_apptMgr.listSlots(doc, date);

    // Step 5: Time slot
    cout << "  Enter time slot (e.g. 09:00): ";
    string time = getInput("");

    // Step 6: Reason
    cout << "  Reason for visit: ";
    string reason = getInput("");
    if (reason.empty()) reason = "General Consultation";

    // Step 7: Confirm
    cout << "\n  Booking: " << doc->getName() << " | " << date << " | " << time
         << " | " << spec << "\n";
    if (!confirm("Confirm booking?")) { cout << "  Booking cancelled.\n"; pressEnter(); return; }

    string err = g_apptMgr.book(pat->getId(), doc, date, time, reason);
    if (err.empty()) {
        g_auth.saveDoctor(doc);
        printSuccess("Appointment booked successfully!");
    } else {
        printError(err);
    }
    pressEnter();
}

static void patientCancelAppointment(Patient* pat) {
    printSectionHeader("Cancel Appointment");
    auto appts = g_apptMgr.getByPatient(pat->getId());
    AppointmentManager::displayList(appts, g_auth, "Your Appointments");
    if (appts.empty()) { pressEnter(); return; }

    string apptId = getInput("\n  Enter Appointment ID to cancel (or 0 to go back): ");
    if (apptId == "0") return;

    if (!confirm("Are you sure you want to cancel appointment " + apptId + "?"))
        return;

    string err = g_apptMgr.cancel(apptId, pat->getId(), false, g_auth);
    if (err.empty()) printSuccess("Appointment cancelled.");
    else             printError(err);
    pressEnter();
}

static void patientViewAppointments(Patient* pat) {
    printSectionHeader("My Appointments");
    auto appts = g_apptMgr.getByPatient(pat->getId());
    AppointmentManager::displayList(appts, g_auth);
    pressEnter();
}

static void patientRequestEmergency(Patient* pat) {
    printSectionHeader("Request Emergency");

    // Show/update city
    cout << "  Your current city ID: " << pat->getCityId()
         << " (" << g_graph.cityName(pat->getCityId()) << ")\n";
    cout << "\n  Available cities:\n";
    g_graph.displayCities();

    if (confirm("\n  Update your city?")) {
        int cityId = -1;
        while (cityId < 0) {
            string cs = getInput("  Enter city ID: ");
            try { cityId = stoi(cs); } catch(...) {}
            if (!g_graph.cityExists(cityId)) {
                printError("City not found."); cityId = -1;
            }
        }
        pat->setCityId(cityId);
        g_auth.saveAll();
    }

    // Category & severity
    string   cat  = selectCategory();
    Severity sev  = selectSeverity();

    cout << "\n  Submitting emergency request...\n"
         << "  City     : " << g_graph.cityName(pat->getCityId()) << "\n"
         << "  Category : " << cat << "\n"
         << "  Severity : " << severityToStr(sev) << "\n";

    if (!confirm("Confirm emergency request?")) {
        cout << "  Request cancelled.\n"; pressEnter(); return;
    }

    Emergency* e = g_emgMgr.submit(pat->getId(), pat->getCityId(), cat, sev);
    printSuccess("Emergency request submitted! ID: " + e->getId());
    cout << "  An administrator will dispatch resources shortly.\n";
    pressEnter();
}

static void patientViewEmergencies(Patient* pat) {
    printSectionHeader("My Emergency Requests");
    auto emgs = g_emgMgr.getByPatient(pat->getId());
    if (emgs.empty()) { cout << "  No emergency requests found.\n"; pressEnter(); return; }
    for (Emergency* e : emgs) {
        cout << "\n  " << string(50, '-') << "\n";
        e->display();
    }
    pressEnter();
}

static void patientMenu(Patient* pat) {
    while (true) {
        clearScreen();
        printBanner();
        printSectionHeader("Patient Dashboard — " + pat->getName());

        printMenuOption(1, "View My Profile");
        printMenuOption(2, "Browse & Book Appointment");
        printMenuOption(3, "Cancel Appointment");
        printMenuOption(4, "View My Appointments");
        printMenuOption(5, "Submit Emergency Request");
        printMenuOption(6, "View My Emergency History");
        printMenuOption(0, "Logout");

        int choice = getMenuChoice(0, 6);
        switch (choice) {
            case 1: patientViewProfile(pat);           break;
            case 2: patientBookAppointment(pat);       break;
            case 3: patientCancelAppointment(pat);     break;
            case 4: patientViewAppointments(pat);      break;
            case 5: patientRequestEmergency(pat);      break;
            case 6: patientViewEmergencies(pat);       break;
            case 0: return;
        }
    }
}

// ============================================================
//  ==================  DOCTOR MENU  =========================
// ============================================================

static void doctorMenu(Doctor* doc) {
    while (true) {
        clearScreen();
        printBanner();
        printSectionHeader("Doctor Dashboard — " + doc->getName());
        cout << "  Specialization : " << doc->getSpecialization() << "\n"
             << "  Type           : " << doctorTypeToStr(doc->getDoctorType()) << "\n"
             << "  Available      : " << (doc->isAvailable() ? "Yes" : "No") << "\n\n";

        printMenuOption(1, "View My Schedule (Booked Slots)");
        printMenuOption(2, "View My Appointments (detailed)");
        printMenuOption(3, "Mark Appointment as Completed");
        printMenuOption(4, "Toggle My Availability");
        printMenuOption(5, "View My Profile");
        printMenuOption(0, "Logout");

        int choice = getMenuChoice(0, 5);
        switch (choice) {
            case 1:
                printSectionHeader("My Schedule");
                doc->displaySchedule();
                pressEnter();
                break;
            case 2: {
                printSectionHeader("My Appointments");
                auto appts = g_apptMgr.getByDoctor(doc->getId());
                AppointmentManager::displayList(appts, g_auth);
                pressEnter();
                break;
            }
            case 3: {
                printSectionHeader("Mark Appointment Completed");
                auto appts = g_apptMgr.getByDoctor(doc->getId());
                AppointmentManager::displayList(appts, g_auth);
                string id = getInput("\n  Enter Appointment ID: ");
                string err = g_apptMgr.markComplete(id, doc->getId(), false);
                if (err.empty()) printSuccess("Appointment marked complete.");
                else             printError(err);
                pressEnter();
                break;
            }
            case 4:
                doc->setAvailable(!doc->isAvailable());
                g_auth.saveDoctor(doc);
                printSuccess(string("Availability set to ") +
                             (doc->isAvailable() ? "Available" : "Unavailable"));
                pressEnter();
                break;
            case 5:
                printSectionHeader("My Profile");
                doc->displayProfile();
                pressEnter();
                break;
            case 0: return;
        }
    }
}

// ============================================================
//  ==================  ADMIN MENU  ==========================
// ============================================================

static void adminViewEmergencyQueue() {
    printSectionHeader("Emergency Priority Queue");
    g_emgMgr.displayPendingQueue(g_graph);
    pressEnter();
}

static void adminDispatchNext() {
    printSectionHeader("Dispatch Next Emergency");

    Emergency* next = g_emgMgr.peekNext();
    if (!next) {
        printInfo("No pending emergencies in the queue.");
        pressEnter(); return;
    }

    cout << "\n  Next eligible emergency:\n";
    cout << "  " << string(50, '-') << "\n";
    next->display();
    cout << "  " << string(50, '-') << "\n";

    // Show resource availability
    cout << "\n  Ambulances available  : " << g_ambMgr.countAvailable() << "\n";
    int availEPs = 0;
    for (Doctor* ep : g_auth.getEmergencyPhysicians())
        if (ep->isAvailable()) ++availEPs;
    cout << "  Emergency physicians  : " << availEPs << " available\n";

    if (!confirm("\n  Dispatch this emergency?"))
        return;

    // Pop and dispatch
    Emergency* e = g_emgMgr.popNext();
    if (!e) { printError("Queue changed; no eligible emergency."); pressEnter(); return; }

    string err = g_emgMgr.dispatch(e, g_ambMgr, g_auth, g_graph);
    if (err.empty()) {
        printSuccess("Emergency " + e->getId() + " dispatched!");
        cout << "\n";
        e->display();
    } else {
        // Put it back by re-inserting into queue is handled via pending status
        printError(err);
        // Re-mark as pending (it still is, since dispatch failed)
    }
    pressEnter();
}

static void adminCompleteEmergency() {
    printSectionHeader("Complete Emergency Mission");
    g_emgMgr.displayDispatched();

    string eid = getInput("\n  Enter Emergency ID to mark complete (or 0 to go back): ");
    if (eid == "0") return;

    if (!confirm("Mark emergency " + eid + " as COMPLETED?")) return;

    string err = g_emgMgr.complete(eid, g_ambMgr, g_auth);
    if (err.empty()) {
        printSuccess("Emergency " + eid + " completed. Resources released.");
    } else {
        printError(err);
    }
    pressEnter();
}

static void adminViewAmbulances() {
    printSectionHeader("Ambulance Fleet Status");
    g_ambMgr.display(g_graph);
    pressEnter();
}

static void adminViewEPStatus() {
    printSectionHeader("Emergency Physician Availability");
    g_emgMgr.displayEPStatus(g_auth);
    pressEnter();
}

static void adminViewCityNetwork() {
    printSectionHeader("City Road Network");
    cout << "\n  Cities:\n";
    g_graph.displayCities();
    cout << "\n  Road Connections:\n";
    g_graph.displayRoads();
    pressEnter();
}

static void adminShortestRoute() {
    printSectionHeader("Calculate Shortest Route");
    g_graph.displayCities();
    int from = -1, to = -1;
    while (!g_graph.cityExists(from)) {
        string s = getInput("\n  From city ID: ");
        try { from = stoi(s); } catch(...) {}
        if (!g_graph.cityExists(from)) printError("City not found.");
    }
    while (!g_graph.cityExists(to)) {
        string s = getInput("  To city ID: ");
        try { to = stoi(s); } catch(...) {}
        if (!g_graph.cityExists(to)) printError("City not found.");
    }
    auto path = g_graph.shortestPath(from, to);
    int  dist = g_graph.shortestDist(from, to);
    cout << "\n  From : " << g_graph.cityName(from) << "\n"
         << "  To   : " << g_graph.cityName(to)   << "\n";
    if (path.empty()) {
        printError("No route found (cities are not connected).");
    } else {
        cout << "  Route: " << g_graph.formatPath(path) << "\n"
             << "  Dist : " << dist << " km\n";
    }
    pressEnter();
}

static void adminManageDoctors() {
    while (true) {
        printSectionHeader("Manage Doctors");
        printMenuOption(1, "View all doctors");
        printMenuOption(2, "View emergency physicians");
        printMenuOption(3, "Add new doctor");
        printMenuOption(4, "Toggle doctor availability");
        printMenuOption(0, "Back");

        int c = getMenuChoice(0, 4);
        if (c == 0) return;

        if (c == 1) {
            auto docs = g_auth.getAllDoctors();
            cout << "\n";
            cout << left << setw(10) << "ID"
                 << setw(28) << "Name"
                 << setw(20) << "Specialization"
                 << setw(22) << "Type"
                 << setw(10) << "Available"
                 << "\n";
            cout << string(90, '-') << "\n";
            for (Doctor* d : docs)
                cout << setw(10) << d->getId()
                     << setw(28) << d->getName()
                     << setw(20) << d->getSpecialization()
                     << setw(22) << doctorTypeToStr(d->getDoctorType())
                     << setw(10) << (d->isAvailable() ? "Yes" : "No")
                     << "\n";
            pressEnter();
        } else if (c == 2) {
            g_emgMgr.displayEPStatus(g_auth);
            pressEnter();
        } else if (c == 3) {
            string uname  = getInput("  Username: ");
            string pw     = getPassword("  Password: ");
            string name   = getInput("  Full name: ");
            cout << "  1. Specialist  2. Emergency Physician\n";
            int dtype = getMenuChoice(1, 2);
            string spec;
            if (dtype == 1) {
                for (size_t i = 0; i < SPECIALIZATIONS.size(); ++i)
                    printMenuOption((int)i+1, SPECIALIZATIONS[i]);
                int si = getMenuChoice(1, (int)SPECIALIZATIONS.size());
                spec = SPECIALIZATIONS[si-1];
            } else {
                spec = "Emergency";
            }
            DoctorType dt = (dtype == 2) ? DoctorType::EMERGENCY_PHYSICIAN
                                         : DoctorType::SPECIALIST;
            string err = g_auth.createDoctor(uname, pw, name, spec, dt);
            if (err.empty()) printSuccess("Doctor created.");
            else             printError(err);
            pressEnter();
        } else if (c == 4) {
            string id = getInput("  Doctor ID: ");
            Doctor* d = g_auth.getDoctorById(id);
            if (!d) { printError("Doctor not found."); pressEnter(); continue; }
            d->setAvailable(!d->isAvailable());
            g_auth.saveDoctor(d);
            printSuccess(d->getName() + " availability set to " +
                         (d->isAvailable() ? "Available" : "Unavailable"));
            pressEnter();
        }
    }
}

static void adminManageAppointments() {
    while (true) {
        printSectionHeader("Manage Appointments");
        printMenuOption(1, "View all appointments");
        printMenuOption(2, "Cancel an appointment");
        printMenuOption(3, "Mark appointment complete");
        printMenuOption(4, "Appointment statistics");
        printMenuOption(0, "Back");

        int c = getMenuChoice(0, 4);
        if (c == 0) return;

        if (c == 1) {
            auto all = g_apptMgr.getAll();
            AppointmentManager::displayList(all, g_auth, "All Appointments");
            pressEnter();
        } else if (c == 2) {
            string id = getInput("  Appointment ID: ");
            if (!confirm("Cancel appointment " + id + "?")) continue;
            string err = g_apptMgr.cancel(id, "", true, g_auth);
            if (err.empty()) printSuccess("Cancelled.");
            else             printError(err);
            pressEnter();
        } else if (c == 3) {
            string id = getInput("  Appointment ID: ");
            string err = g_apptMgr.markComplete(id, "", true);
            if (err.empty()) printSuccess("Marked complete.");
            else             printError(err);
            pressEnter();
        } else if (c == 4) {
            printSectionHeader("Appointment Statistics");
            g_apptMgr.displayStats();
            pressEnter();
        }
    }
}

static void adminViewEmergencyHistory() {
    printSectionHeader("Emergency History");
    g_emgMgr.displayAll(g_graph);
    pressEnter();
}

static void adminViewStats() {
    printSectionHeader("System Statistics");
    // Patients
    int patients = (int)g_auth.getAllPatients().size();
    int doctors  = (int)g_auth.getAllDoctors().size();
    // Ambulances
    int ambAvail = g_ambMgr.countAvailable();
    int ambBusy  = g_ambMgr.countDispatched();
    // EPs
    int epAvail = 0, epBusy = 0;
    for (Doctor* ep : g_auth.getEmergencyPhysicians())
        (ep->isAvailable() ? epAvail : epBusy)++;
    // Emergencies
    auto all = g_emgMgr.getAll();
    int emgPending = 0, emgDisp = 0, emgComp = 0;
    for (Emergency* e : all) {
        switch(e->getStatus()) {
            case EmergencyStatus::PENDING:    ++emgPending; break;
            case EmergencyStatus::DISPATCHED: ++emgDisp;   break;
            case EmergencyStatus::COMPLETED:  ++emgComp;   break;
            default: break;
        }
    }

    cout << "\n  === User Statistics ===\n"
         << "  Registered Patients   : " << patients << "\n"
         << "  Registered Doctors    : " << doctors  << "\n\n"
         << "  === Ambulance Fleet ===\n"
         << "  Available             : " << ambAvail << " / 10\n"
         << "  Dispatched            : " << ambBusy  << "\n\n"
         << "  === Emergency Physicians ===\n"
         << "  Available             : " << epAvail  << " / 4\n"
         << "  Occupied              : " << epBusy   << "\n\n"
         << "  === Emergency Requests ===\n"
         << "  Pending               : " << emgPending << "\n"
         << "  Dispatched (Active)   : " << emgDisp    << "\n"
         << "  Completed             : " << emgComp    << "\n\n";
    g_apptMgr.displayStats();
    pressEnter();
}

static void adminViewPatients() {
    printSectionHeader("Registered Patients");
    auto pts = g_auth.getAllPatients();
    if (pts.empty()) { cout << "  No patients registered.\n"; pressEnter(); return; }
    cout << "\n";
    cout << left << setw(10) << "ID"
         << setw(22) << "Username"
         << setw(28) << "Name"
         << setw(16) << "Phone"
         << setw(12) << "City ID"
         << "\n";
    cout << string(88, '-') << "\n";
    for (Patient* p : pts)
        cout << setw(10) << p->getId()
             << setw(22) << p->getUsername()
             << setw(28) << p->getName()
             << setw(16) << p->getPhone()
             << setw(12) << p->getCityId()
             << "\n";
    pressEnter();
}

static void adminMenu() {
    while (true) {
        clearScreen();
        printBanner();
        printSectionHeader("Administrator Dashboard");

        printMenuOption(1,  "View Emergency Priority Queue");
        printMenuOption(2,  "Dispatch Next Emergency");
        printMenuOption(3,  "Complete Emergency Mission");
        printMenuOption(4,  "View Ambulance Fleet Status");
        printMenuOption(5,  "View Emergency Physician Status");
        printMenuOption(6,  "View City Network / Shortest Route");
        printMenuOption(7,  "Manage Doctors");
        printMenuOption(8,  "Manage Appointments");
        printMenuOption(9,  "View Emergency History");
        printMenuOption(10, "View Patients");
        printMenuOption(11, "System Statistics");
        printMenuOption(0,  "Logout");

        int choice = getMenuChoice(0, 11);
        switch (choice) {
            case 1:  adminViewEmergencyQueue();  break;
            case 2:  adminDispatchNext();        break;
            case 3:  adminCompleteEmergency();   break;
            case 4:  adminViewAmbulances();      break;
            case 5:  adminViewEPStatus();        break;
            case 6:
                while (true) {
                    printSectionHeader("City Network");
                    printMenuOption(1, "View city list and roads");
                    printMenuOption(2, "Calculate shortest route");
                    printMenuOption(0, "Back");
                    int sc = getMenuChoice(0, 2);
                    if (sc == 0) break;
                    if (sc == 1) adminViewCityNetwork();
                    if (sc == 2) adminShortestRoute();
                }
                break;
            case 7:  adminManageDoctors();       break;
            case 8:  adminManageAppointments();  break;
            case 9:  adminViewEmergencyHistory();break;
            case 10: adminViewPatients();        break;
            case 11: adminViewStats();           break;
            case 0:  return;
        }
    }
}

// ============================================================
//  ==================  LOGIN / REGISTER  ====================
// ============================================================

static void registerPatient() {
    printSectionHeader("Patient Registration");
    string uname   = getInput("Username       : ");
    string pw      = getPassword("Password       : ");
    string pw2     = getPassword("Confirm password: ");
    if (pw != pw2) { printError("Passwords do not match."); pressEnter(); return; }
    string name    = getInput("Full name      : ");
    string phone   = getInput("Phone number   : ");
    string address = getInput("Address        : ");

    cout << "\n  Select your city:\n";
    g_graph.displayCities();
    int cityId = -1;
    while (!g_graph.cityExists(cityId)) {
        string s = getInput("  City ID: ");
        try { cityId = stoi(s); } catch(...) {}
        if (!g_graph.cityExists(cityId)) printError("Invalid city ID.");
    }

    string err = g_auth.registerPatient(uname, pw, name, phone, address, cityId);
    if (err.empty()) printSuccess("Registration successful! You can now log in.");
    else             printError(err);
    pressEnter();
}

static void loginFlow() {
    printSectionHeader("Login");
    string uname = getInput("Username: ");
    string pw    = getPassword("Password: ");

    User* user = g_auth.login(uname, pw);
    if (!user) {
        printError("Invalid username or password.");
        pressEnter(); return;
    }

    printSuccess("Welcome, " + user->getName() + "!");
    pressEnter();

    switch (user->getRole()) {
        case Role::PATIENT:
            patientMenu(dynamic_cast<Patient*>(user)); break;
        case Role::DOCTOR:
            doctorMenu(dynamic_cast<Doctor*>(user));   break;
        case Role::ADMIN:
            adminMenu();                                break;
    }
}

// ============================================================
//  ==================  FIRST-RUN SETUP  =====================
// ============================================================

static void firstRunSetup() {
    clearScreen();
    printBanner();
    cout << "\n  \033[1;33mFirst-run setup detected. Creating administrator account.\033[0m\n\n";
    cout << "  This admin account controls the entire RESQ system.\n";
    cout << "  Press Enter directly to use default credentials (admin / admin123),\n";
    cout << "  or enter custom credentials below:\n\n";

    string uname = getInput("Admin username [admin]: ");
    if (uname.empty()) {
        g_auth.createAdmin("admin", "admin123", "System Administrator");
        printSuccess("Default administrator account created (admin / admin123)!");
        pressEnter();
        return;
    }
    string pw    = getPassword("Admin password         : ");
    string pw2   = getPassword("Confirm password       : ");
    if (pw != pw2) {
        cout << "\n  Passwords do not match. Exiting setup.\n";
        exit(1);
    }
    string name = getInput("Your full name         : ");
    if (name.empty()) name = "System Administrator";
    g_auth.createAdmin(uname, pw, name);
    printSuccess("Administrator account created!");
    pressEnter();
}

// ============================================================
//  ==================  MAIN MENU  ===========================
// ============================================================

static void mainMenu() {
    while (true) {
        clearScreen();
        printBanner();
        cout << "  Welcome to the RESQ Hospital Emergency Management System\n";
        cout << "  A terminal-based hospital coordination platform\n\n";

        printMenuOption(1, "Login");
        printMenuOption(2, "Register as Patient");
        printMenuOption(0, "Exit");

        int choice = getMenuChoice(0, 2);
        switch (choice) {
            case 1: loginFlow();      break;
            case 2: registerPatient();break;
            case 0:
                cout << "\n  Thank you for using RESQ. Stay safe!\n\n";
                return;
        }
    }
}

// ============================================================
//  ==================  main()  ==============================
// ============================================================

int main() {
    // Enable ANSI escape codes on Windows 10+
#ifdef _WIN32
    system("chcp 65001 > nul");
    system(""); // Enable ANSI
#endif

    // Initialize data directory
    ensureFile("data/users.txt");
    ensureFile("data/doctors.txt");
    ensureFile("data/ambulances.txt");
    ensureFile("data/emergencies.txt");
    ensureFile("data/appointments.txt");
    ensureFile("data/cities.txt");

    // Load or initialize city graph
    if (!loadCitiesFromFile(g_graph, "data/cities.txt")) {
        g_graph.initSampleNetwork();
        saveCitiesToFile(g_graph, "data/cities.txt");
    }

    // Load users and doctors
    g_auth.loadAll();

    // First-run: create admin if none exists
    if (!g_auth.adminExists()) {
        firstRunSetup();
    }

    // Seed sample doctors if not present
    g_auth.seedSampleDoctors();

    // Load ambulances (initialize fleet on first run)
    g_ambMgr.load();
    g_ambMgr.initFleet();

    // Load emergencies (restores pending queue)
    g_emgMgr.load();

    // Load appointments (restores doctor slots)
    g_apptMgr.load(g_auth);

    // Start main menu
    mainMenu();

    return 0;
}
