// ============================================================
//  FileManager.cpp  –  Persistent storage helpers
//  Included by main.cpp (unity build).  Do NOT compile alone.
// ============================================================

static const char DELIM = '|';

// ---- String utilities ---------------------------------------
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

// ==================== SHA-256 ================================
// PBKDF2-style password hashing (educational implementation).
// For production use libsodium with Argon2id.

static const uint32_t SHA256_K[64] = {
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,
    0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,
    0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,
    0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,
    0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,
    0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,
    0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,
    0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,
    0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
};

static inline uint32_t rotr32(uint32_t x, int n) {
    return (x >> n) | (x << (32 - n));
}

static string sha256hex(const string& input) {
    vector<uint8_t> msg(input.begin(), input.end());
    uint64_t bitLen = (uint64_t)msg.size() * 8;
    msg.push_back(0x80);
    while (msg.size() % 64 != 56) msg.push_back(0x00);
    for (int i = 7; i >= 0; --i)
        msg.push_back((uint8_t)(bitLen >> (8 * i)));

    uint32_t h[8] = {
        0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
        0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19
    };

    for (size_t blk = 0; blk < msg.size(); blk += 64) {
        uint32_t w[64];
        for (int i = 0; i < 16; ++i)
            w[i] = ((uint32_t)msg[blk+i*4]   << 24) |
                   ((uint32_t)msg[blk+i*4+1] << 16) |
                   ((uint32_t)msg[blk+i*4+2] <<  8) |
                   ((uint32_t)msg[blk+i*4+3]);
        for (int i = 16; i < 64; ++i) {
            uint32_t s0 = rotr32(w[i-15],7)  ^ rotr32(w[i-15],18) ^ (w[i-15] >> 3);
            uint32_t s1 = rotr32(w[i-2], 17) ^ rotr32(w[i-2], 19) ^ (w[i-2]  >> 10);
            w[i] = w[i-16] + s0 + w[i-7] + s1;
        }
        uint32_t a=h[0], b=h[1], c=h[2], d=h[3],
                 e=h[4], f=h[5], g=h[6], hv=h[7];
        for (int i = 0; i < 64; ++i) {
            uint32_t S1   = rotr32(e,6) ^ rotr32(e,11) ^ rotr32(e,25);
            uint32_t ch   = (e & f) ^ ((~e) & g);
            uint32_t tmp1 = hv + S1 + ch + SHA256_K[i] + w[i];
            uint32_t S0   = rotr32(a,2) ^ rotr32(a,13) ^ rotr32(a,22);
            uint32_t maj  = (a & b) ^ (a & c) ^ (b & c);
            uint32_t tmp2 = S0 + maj;
            hv=g; g=f; f=e; e=d+tmp1;
            d=c; c=b; b=a; a=tmp1+tmp2;
        }
        h[0]+=a; h[1]+=b; h[2]+=c; h[3]+=d;
        h[4]+=e; h[5]+=f; h[6]+=g; h[7]+=hv;
    }
    ostringstream oss;
    for (int i = 0; i < 8; ++i)
        oss << hex << setw(8) << setfill('0') << h[i];
    return oss.str();
}

// PBKDF2-like: 10000 rounds of SHA-256 with random salt
static string hashPassword(const string& password) {
    mt19937_64 rng(
        (uint64_t)chrono::steady_clock::now().time_since_epoch().count() ^
        (uint64_t)(uintptr_t)&password);
    uint64_t s1 = rng(), s2 = rng();
    ostringstream ss;
    ss << hex << setw(16) << setfill('0') << s1
              << setw(16) << setfill('0') << s2;
    string saltHex = ss.str();

    string derived = saltHex + password;
    for (int i = 0; i < 10000; ++i)
        derived = sha256hex(derived + saltHex);

    return saltHex + "$" + derived;
}

static bool verifyPassword(const string& password, const string& stored) {
    size_t pos = stored.find('$');
    if (pos == string::npos) return false;
    string saltHex = stored.substr(0, pos);
    string derived = saltHex + password;
    for (int i = 0; i < 10000; ++i)
        derived = sha256hex(derived + saltHex);
    return (saltHex + "$" + derived) == stored;
}

// ==================== ID generation ==========================
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

// ==================== Timestamp helpers ======================
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

// ==================== Cities file ============================
static void saveCitiesToFile(const Graph& g, const string& path) {
    ofstream f(path, ios::trunc);
    f << "# RESQ City Network\n";
    for (unordered_map<int,City>::const_iterator it = g.cities.begin();
         it != g.cities.end(); ++it)
        f << "CITY|" << it->first << "|" << it->second.name << "\n";

    set<pair<int,int>> saved;
    for (unordered_map<int,vector<Edge>>::const_iterator it = g.adj.begin();
         it != g.adj.end(); ++it) {
        int u = it->first;
        for (size_t i = 0; i < it->second.size(); ++i) {
            int v = it->second[i].to;
            int w = it->second[i].weight;
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
