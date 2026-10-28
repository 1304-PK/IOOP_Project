// city road network and dijkstra routing

// city
struct City {
    int    id;
    string name;
};

// edge
struct Edge {
    int to;       // destination city id
    int weight;   // distance in km
};

// graph
class Graph {
public:
    unordered_map<int, City>          cities;      // id -> city
    unordered_map<int, vector<Edge>>  adj;         // adjacency list

    void addCity(int id, const string& name) {
        cities[id] = {id, name};
        if (adj.find(id) == adj.end())
            adj[id] = vector<Edge>();
    }

    void addRoad(int from, int to, int weight) {
        adj[from].push_back({to,   weight});
        adj[to].push_back({from, weight});
    }

    bool cityExists(int id) const {
        return cities.find(id) != cities.end();
    }

    string cityName(int id) const {
        auto it = cities.find(id);
        return (it != cities.end()) ? it->second.name : "Unknown";
    }

    // dijkstra - returns dist and pred
    pair<unordered_map<int,int>, unordered_map<int,int>>
    dijkstra(int src) const {
        typedef pair<int,int> pii;
        priority_queue<pii, vector<pii>, greater<pii>> pq;

        unordered_map<int,int> dist;
        unordered_map<int,int> pred;

        for (const auto& p : cities) {
            dist[p.first] = INT_MAX;
            pred[p.first] = -1;
        }
        dist[src] = 0;
        pq.push(make_pair(0, src));

        while (!pq.empty()) {
            int d = pq.top().first;
            int u = pq.top().second;
            pq.pop();
            if (d > dist[u]) continue;

            auto eit = adj.find(u);
            if (eit == adj.end()) continue;

            for (const auto& edge : eit->second) {
                int v  = edge.to;
                int nd = dist[u] + edge.weight;
                if (nd < dist[v]) {
                    dist[v] = nd;
                    pred[v] = u;
                    pq.push(make_pair(nd, v));
                }
            }
        }
        return make_pair(dist, pred);
    }

    vector<int> shortestPath(int src, int dst) const {
        if (!cityExists(src) || !cityExists(dst)) return vector<int>();

        pair<unordered_map<int,int>, unordered_map<int,int>> result = dijkstra(src);
        unordered_map<int,int>& dist = result.first;
        unordered_map<int,int>& pred = result.second;

        if (dist[dst] == INT_MAX) return vector<int>();

        vector<int> path;
        for (int cur = dst; cur != -1; cur = pred[cur])
            path.push_back(cur);
        reverse(path.begin(), path.end());
        return path;
    }

    int shortestDist(int src, int dst) const {
        if (!cityExists(src) || !cityExists(dst)) return -1;
        pair<unordered_map<int,int>, unordered_map<int,int>> result = dijkstra(src);
        int d = result.first[dst];
        return (d == INT_MAX) ? -1 : d;
    }

    string formatPath(const vector<int>& path) const {
        if (path.empty()) return "No route available";
        string s;
        for (size_t i = 0; i < path.size(); ++i) {
            if (i) s += " -> ";
            s += cityName(path[i]);
        }
        return s;
    }

    void displayCities() const {
        cout << left << setw(6) << "ID"
             << setw(30) << "City Name" << "\n";
        cout << string(36, '-') << "\n";
        for (const auto& p : cities)
            cout << left << setw(6)  << p.first
                 << setw(30) << p.second.name << "\n";
    }

    void displayRoads() const {
        for (const auto& p : adj) {
            cout << "  " << cityName(p.first) << ":\n";
            for (const auto& edge : p.second)
                cout << "      -> " << setw(26) << cityName(edge.to)
                     << edge.weight << " km\n";
        }
    }

    void initSampleNetwork() {
        addCity(0,  "Central Hospital City");
        addCity(1,  "Northville");
        addCity(2,  "Eastbrook");
        addCity(3,  "Southgate");
        addCity(4,  "Westfield");
        addCity(5,  "Riverdale");
        addCity(6,  "Hillcrest");
        addCity(7,  "Lakeside");
        addCity(8,  "Meadowbrook");
        addCity(9,  "Pinecrest");
        addCity(10, "Fairview");
        addCity(11, "Oakwood");
        addCity(12, "Mapleton");
        addCity(13, "Cedarville");
        addCity(14, "Springdale");

        addRoad(0,  1,  12);
        addRoad(0,  2,  18);
        addRoad(0,  3,  15);
        addRoad(0,  4,  20);
        addRoad(1,  5,  10);
        addRoad(1,  6,  22);
        addRoad(2,  7,  14);
        addRoad(2,  8,  25);
        addRoad(3,  9,  17);
        addRoad(3,  10, 30);
        addRoad(4,  11, 13);
        addRoad(4,  12, 28);
        addRoad(5,  6,  16);
        addRoad(6,  13, 19);
        addRoad(7,  8,  11);
        addRoad(8,  14, 23);
        addRoad(9,  10, 20);
        addRoad(10, 14, 18);
        addRoad(11, 12, 15);
        addRoad(12, 13, 24);
        addRoad(13, 14, 21);
        addRoad(1,  2,  30);
        addRoad(3,  4,  35);
        addRoad(6,  7,  27);
    }
};
