// persistent storage helpers

static const char DELIM = '|';

// string utilities
static vector<string> split(const string& s, char delim = DELIM) {
    vector<string> tokens;
    string tok;
    istringstream ss(s);
    while (getline(ss, tok, delim))
        tokens.push_back(tok);
    return tokens;
}

static string trim(const string& s) {
    size_t a = s.find_first_not_of(" \t\r\n");
    size_t b = s.find_last_not_of(" \t\r\n");
    return (a == string::npos) ? "" : s.substr(a, b - a + 1);
}

static void ensureFile(const string& path) {
    ifstream f(path);
    if (!f.good()) {
        ofstream out(path);
        out.close();
    }
}

static vector<string> readLines(const string& path) {
    vector<string> lines;
    ifstream f(path);
    string line;
    while (getline(f, line)) {
        line = trim(line);
        if (!line.empty() && line[0] != '#')
            lines.push_back(line);
    }
    return lines;
}

static void writeLines(const string& path, const vector<string>& lines) {
    ofstream f(path, ios::trunc);
    for (size_t i = 0; i < lines.size(); ++i)
        f << lines[i] << "\n";
}

static void appendLine(const string& path, const string& line) {
    ofstream f(path, ios::app);
    f << line << "\n";
}

// polynomial string hashing for password storage

static string hashPassword(const string& password) {
    unsigned long long hash = 5381;
    for (char c : password) {
        hash = ((hash << 5) + hash) + (unsigned char)c;
    }
    ostringstream oss;
    oss << hex << hash;
    return oss.str();
}

static bool verifyPassword(const string& password, const string& stored) {
    return hashPassword(password) == stored;
}

// id generation
static string genId(const string& prefix, const string& filePath) {
    int maxN = 0;
    vector<string> lines = readLines(filePath);
    for (size_t i = 0; i < lines.size(); ++i) {
        vector<string> tok = split(lines[i]);
        if (!tok.empty() && tok[0].size() > prefix.size() &&
            tok[0].substr(0, prefix.size()) == prefix) {
            try {
                int n = stoi(tok[0].substr(prefix.size()));
                if (n > maxN) maxN = n;
            } catch(...) {}
        }
    }
    ostringstream oss;
    oss << prefix << setw(3) << setfill('0') << (maxN + 1);
    return oss.str();
}

// timestamp helpers
static string nowTimestamp() {
    time_t t = time(nullptr);
    struct tm* tmPtr = localtime(&t);
    char buf[32];
    if (tmPtr) strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", tmPtr);
    else buf[0] = '\0';
    return string(buf);
}

static long long nowEpoch() {
    return (long long)time(nullptr);
}

// cities file helpers
static void saveCitiesToFile(const Graph& g, const string& path) {
    ofstream f(path, ios::trunc);
    f << "# RESQ City Network\n";
    for (const auto& p : g.cities)
        f << "CITY|" << p.first << "|" << p.second.name << "\n";

    set<pair<int,int>> saved;
    for (const auto& p : g.adj) {
        int u = p.first;
        for (const auto& edge : p.second) {
            int v = edge.to;
            int w = edge.weight;
            if (u < v && saved.find(make_pair(u,v)) == saved.end()) {
                f << "ROAD|" << u << "|" << v << "|" << w << "\n";
                saved.insert(make_pair(u,v));
            }
        }
    }
}

static bool loadCitiesFromFile(Graph& g, const string& path) {
    vector<string> lines = readLines(path);
    if (lines.empty()) return false;
    for (size_t i = 0; i < lines.size(); ++i) {
        vector<string> tok = split(lines[i]);
        if (tok.empty()) continue;
        if (tok[0] == "CITY" && tok.size() >= 3)
            g.addCity(stoi(tok[1]), tok[2]);
        else if (tok[0] == "ROAD" && tok.size() >= 4)
            g.addRoad(stoi(tok[1]), stoi(tok[2]), stoi(tok[3]));
    }
    return !g.cities.empty();
}
