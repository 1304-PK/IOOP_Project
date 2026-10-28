import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../RESQ/data');
const DELIM = '|';

// ensure files exist
function ensureFile(filename, defaultContent = '') {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(filePath, defaultContent, 'utf-8');
  }
  return filePath;
}

function readLines(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#'));
}

function writeLines(filename, lines) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, lines.join('\n') + (lines.length ? '\n' : ''), 'utf-8');
}

function appendLine(filename, line) {
  const filePath = path.join(DATA_DIR, filename);
  fs.appendFileSync(filePath, line + '\n', 'utf-8');
}

function genId(prefix, filename) {
  let maxN = 0;
  const lines = readLines(filename);
  for (const line of lines) {
    const tok = line.split(DELIM);
    if (tok.length > 0 && tok[0].startsWith(prefix)) {
      const n = parseInt(tok[0].slice(prefix.length), 10);
      if (!isNaN(n) && n > maxN) maxN = n;
    }
  }
  return `${prefix}${String(maxN + 1).padStart(3, '0')}`;
}

// C++ 64-bit polynomial hash implementation
function hashPassword(password) {
  let hash = 5381n;
  for (let i = 0; i < password.length; i++) {
    hash = (((hash << 5n) + hash) + BigInt(password.charCodeAt(i))) & 0xFFFFFFFFFFFFFFFFn;
  }
  return hash.toString(16);
}

function nowTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function nowEpoch() {
  return Math.floor(Date.now() / 1000);
}

// Graph and Dijkstra
function getGraph() {
  const lines = readLines('cities.txt');
  const cities = {};
  const adj = {};
  for (const line of lines) {
    const tok = line.split(DELIM);
    if (tok[0] === 'CITY' && tok.length >= 3) {
      const id = parseInt(tok[1], 10);
      cities[id] = { id, name: tok[2] };
      if (!adj[id]) adj[id] = [];
    } else if (tok[0] === 'ROAD' && tok.length >= 4) {
      const u = parseInt(tok[1], 10);
      const v = parseInt(tok[2], 10);
      const w = parseInt(tok[3], 10);
      if (!adj[u]) adj[u] = [];
      if (!adj[v]) adj[v] = [];
      adj[u].push({ to: v, weight: w });
      adj[v].push({ to: u, weight: w });
    }
  }
  return { cities, adj };
}

function dijkstra(graph, src) {
  const dist = {};
  const pred = {};
  const visited = new Set();
  for (const id in graph.cities) {
    dist[id] = Infinity;
    pred[id] = null;
  }
  dist[src] = 0;

  while (true) {
    let u = null;
    let minDist = Infinity;
    for (const id in dist) {
      const numId = parseInt(id, 10);
      if (!visited.has(numId) && dist[id] < minDist) {
        minDist = dist[id];
        u = numId;
      }
    }
    if (u === null) break;
    visited.add(u);

    const edges = graph.adj[u] || [];
    for (const edge of edges) {
      const v = edge.to;
      const nd = dist[u] + edge.weight;
      if (nd < dist[v]) {
        dist[v] = nd;
        pred[v] = u;
      }
    }
  }
  return { dist, pred };
}

function shortestPath(graph, src, dst) {
  if (!graph.cities[src] || !graph.cities[dst]) return [];
  const { dist, pred } = dijkstra(graph, src);
  if (dist[dst] === Infinity) return [];
  const path = [];
  let cur = dst;
  while (cur !== null && cur !== undefined) {
    path.push(cur);
    cur = pred[cur];
  }
  path.reverse();
  return path;
}

function formatPath(graph, path) {
  if (!path || path.length === 0) return 'No route available';
  return path.map(id => graph.cities[id]?.name || `City ${id}`).join(' -> ');
}

// Data parser helpers
function parseUsers() {
  const lines = readLines('users.txt');
  return lines.map(line => {
    const tok = line.split(DELIM);
    if (tok[3] === 'ADMIN') {
      return { id: tok[0], username: tok[1], role: 'ADMIN', name: tok[4], hash: tok[2] };
    } else {
      return {
        id: tok[0],
        username: tok[1],
        role: 'PATIENT',
        name: tok[4],
        phone: tok[5],
        address: tok[6],
        cityId: parseInt(tok[7] || '0', 10),
        registeredAt: tok[8],
        hash: tok[2]
      };
    }
  });
}

function parseDoctors() {
  const lines = readLines('doctors.txt');
  return lines.map(line => {
    const tok = line.split(DELIM);
    const slotsObj = {};
    if (tok[9] && tok[9] !== 'NONE') {
      const entries = tok[9].split(';');
      for (const entry of entries) {
        const lastColon = entry.lastIndexOf(':');
        if (lastColon !== -1) {
          slotsObj[entry.slice(0, lastColon)] = entry.slice(lastColon + 1);
        }
      }
    }
    return {
      id: tok[0],
      username: tok[1],
      hash: tok[2],
      role: 'DOCTOR',
      name: tok[4],
      specialization: tok[5],
      type: tok[6], // SPECIALIST or EMERGENCY_PHYSICIAN
      available: tok[7] === '1',
      assignedEmergId: tok[8] === 'NONE' ? '' : tok[8],
      bookedSlots: slotsObj
    };
  });
}

function serializeDoctor(doc) {
  const slotEntries = Object.entries(doc.bookedSlots || {}).map(([k, v]) => `${k}:${v}`);
  const slotsStr = slotEntries.length ? slotEntries.join(';') : 'NONE';
  return [
    doc.id,
    doc.username,
    doc.hash,
    'DOCTOR',
    doc.name,
    doc.specialization,
    doc.type,
    doc.available ? '1' : '0',
    doc.assignedEmergId || 'NONE',
    slotsStr
  ].join(DELIM);
}

function parseAmbulances() {
  const lines = readLines('ambulances.txt');
  return lines.map(line => {
    const tok = line.split(DELIM);
    return {
      id: tok[0],
      status: tok[1], // AVAILABLE or DISPATCHED
      currentCityId: parseInt(tok[2] || '0', 10),
      assignedEmergId: tok[3] === 'NONE' ? '' : tok[3],
      capabilities: tok[4]
    };
  });
}

function serializeAmbulance(a) {
  return [
    a.id,
    a.status,
    a.currentCityId,
    a.assignedEmergId || 'NONE',
    a.capabilities
  ].join(DELIM);
}

const SEVERITY_VALS = { CRITICAL: 1, HIGH: 2, MODERATE: 3, LOW: 4 };

function parseEmergencies() {
  const lines = readLines('emergencies.txt');
  return lines.map(line => {
    const tok = line.split(DELIM);
    return {
      id: tok[0],
      patientId: tok[1],
      cityId: parseInt(tok[2] || '0', 10),
      category: tok[3],
      severity: tok[4],
      severityVal: SEVERITY_VALS[tok[4]] || 4,
      requestTimestamp: tok[5],
      epochTime: parseInt(tok[6] || '0', 10),
      seqNum: parseInt(tok[7] || '0', 10),
      assignedAmbId: tok[8] === 'NONE' ? '' : tok[8],
      physician1Id: tok[9] === 'NONE' ? '' : tok[9],
      physician2Id: tok[10] === 'NONE' ? '' : tok[10],
      status: tok[11], // PENDING, DISPATCHED, COMPLETED, CANCELLED
      outboundRoute: tok[12] === 'NONE' ? '' : tok[12],
      returnRoute: tok[13] === 'NONE' ? '' : tok[13],
      distanceKm: parseInt(tok[14] || '0', 10),
      completedAt: tok[15] === 'NONE' || !tok[15] ? '' : tok[15]
    };
  });
}

function serializeEmergency(e) {
  const val = (s) => (s && s.length ? s : 'NONE');
  return [
    e.id,
    e.patientId,
    e.cityId,
    e.category,
    e.severity,
    e.requestTimestamp,
    e.epochTime,
    e.seqNum,
    val(e.assignedAmbId),
    val(e.physician1Id),
    val(e.physician2Id),
    e.status,
    val(e.outboundRoute),
    val(e.returnRoute),
    e.distanceKm,
    val(e.completedAt)
  ].join(DELIM);
}

function parseAppointments() {
  const lines = readLines('appointments.txt');
  return lines.map(line => {
    const tok = line.split(DELIM);
    return {
      id: tok[0],
      patientId: tok[1],
      doctorId: tok[2],
      specialization: tok[3],
      date: tok[4],
      timeSlot: tok[5],
      reason: tok[6],
      status: tok[7], // PENDING, CONFIRMED, CANCELLED, COMPLETED
      bookedAt: tok[8]
    };
  });
}

function serializeAppointment(a) {
  return [
    a.id,
    a.patientId,
    a.doctorId,
    a.specialization,
    a.date,
    a.timeSlot,
    a.reason,
    a.status,
    a.bookedAt
  ].join(DELIM);
}

// Vite plugin providing full /api endpoints
export function resqApiPlugin() {
  return {
    name: 'resq-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api')) {
          return next();
        }

        // Helper to send json
        const sendJson = (status, data) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };

        // Parse JSON body for POST / PUT
        let body = {};
        if (req.method === 'POST' || req.method === 'PUT') {
          try {
            const buffers = [];
            for await (const chunk of req) buffers.push(chunk);
            const raw = Buffer.concat(buffers).toString();
            body = raw ? JSON.parse(raw) : {};
          } catch (e) {
            return sendJson(400, { error: 'Invalid JSON body' });
          }
        }

        const url = new URL(req.url, 'http://localhost');
        const pathname = url.pathname;

        try {
          // --- AUTH: LOGIN ---
          if (pathname === '/api/auth/login' && req.method === 'POST') {
            const { username, password } = body;
            if (!username || !password) {
              return sendJson(400, { error: 'Username and password are required' });
            }
            const hash = hashPassword(password);
            const users = parseUsers();
            const matchedUser = users.find(u => u.username === username && u.hash === hash);
            if (matchedUser) {
              const { hash: _, ...safeUser } = matchedUser;
              return sendJson(200, { user: safeUser });
            }
            const doctors = parseDoctors();
            const matchedDoc = doctors.find(d => d.username === username && d.hash === hash);
            if (matchedDoc) {
              const { hash: _, ...safeDoc } = matchedDoc;
              return sendJson(200, { user: safeDoc });
            }
            return sendJson(401, { error: 'Invalid username or password' });
          }

          // --- AUTH: REGISTER PATIENT ---
          if (pathname === '/api/auth/register' && req.method === 'POST') {
            const { username, password, name, phone, address, cityId } = body;
            if (!username || !password || !name) {
              return sendJson(400, { error: 'Username, password, and name are required' });
            }
            if (password.length < 6) {
              return sendJson(400, { error: 'Password must be at least 6 characters' });
            }
            const users = parseUsers();
            if (users.some(u => u.username === username)) {
              return sendJson(400, { error: `Username '${username}' is already taken` });
            }
            const id = genId('PAT', 'users.txt');
            const hash = hashPassword(password);
            const regAt = nowTimestamp();
            const line = [id, username, hash, 'PATIENT', name, phone || '', address || '', cityId || 0, regAt].join(DELIM);
            appendLine('users.txt', line);
            return sendJson(200, {
              success: true,
              user: { id, username, role: 'PATIENT', name, phone, address, cityId: parseInt(cityId || 0, 10), registeredAt: regAt }
            });
          }

          // --- CITIES & NETWORK ---
          if (pathname === '/api/cities' && req.method === 'GET') {
            const graph = getGraph();
            return sendJson(200, { cities: Object.values(graph.cities), roads: graph.adj });
          }

          // --- ROUTE CALCULATOR ---
          if (pathname === '/api/route' && req.method === 'GET') {
            const from = parseInt(url.searchParams.get('from'), 10);
            const to = parseInt(url.searchParams.get('to'), 10);
            const graph = getGraph();
            if (isNaN(from) || isNaN(to) || !graph.cities[from] || !graph.cities[to]) {
              return sendJson(400, { error: 'Invalid city IDs' });
            }
            const pathArr = shortestPath(graph, from, to);
            const { dist } = dijkstra(graph, from);
            const distanceKm = dist[to] === Infinity ? -1 : dist[to];
            return sendJson(200, {
              from: graph.cities[from],
              to: graph.cities[to],
              path: pathArr,
              pathFormatted: formatPath(graph, pathArr),
              distanceKm
            });
          }

          // --- DOCTORS ---
          if (pathname === '/api/doctors' && req.method === 'GET') {
            const doctors = parseDoctors().map(({ hash, ...d }) => d);
            return sendJson(200, { doctors });
          }

          // --- CREATE DOCTOR ---
          if (pathname === '/api/doctors' && req.method === 'POST') {
            const { username, password, name, specialization, type } = body;
            if (!username || !password || !name) {
              return sendJson(400, { error: 'Username, password, and name are required' });
            }
            const doctors = parseDoctors();
            if (doctors.some(d => d.username === username)) {
              return sendJson(400, { error: `Doctor username '${username}' already exists` });
            }
            const id = genId('DOC', 'doctors.txt');
            const hash = hashPassword(password);
            const newDoc = {
              id,
              username,
              hash,
              role: 'DOCTOR',
              name,
              specialization: specialization || 'General Medicine',
              type: type === 'EMERGENCY_PHYSICIAN' ? 'EMERGENCY_PHYSICIAN' : 'SPECIALIST',
              available: true,
              assignedEmergId: '',
              bookedSlots: {}
            };
            appendLine('doctors.txt', serializeDoctor(newDoc));
            const { hash: _, ...safeDoc } = newDoc;
            return sendJson(200, { success: true, doctor: safeDoc });
          }

          // --- TOGGLE DOCTOR AVAILABILITY ---
          if (pathname === '/api/doctors/toggle-availability' && req.method === 'POST') {
            const { doctorId } = body;
            const doctors = parseDoctors();
            const doc = doctors.find(d => d.id === doctorId);
            if (!doc) return sendJson(404, { error: 'Doctor not found' });
            doc.available = !doc.available;
            writeLines('doctors.txt', doctors.map(serializeDoctor));
            return sendJson(200, { success: true, available: doc.available });
          }

          // --- AMBULANCES ---
          if (pathname === '/api/ambulances' && req.method === 'GET') {
            const ambulances = parseAmbulances();
            return sendJson(200, { ambulances });
          }

          // --- APPOINTMENTS: LIST ---
          if (pathname === '/api/appointments' && req.method === 'GET') {
            const appts = parseAppointments();
            return sendJson(200, { appointments: appts });
          }

          // --- APPOINTMENTS: BOOK ---
          if (pathname === '/api/appointments' && req.method === 'POST') {
            const { patientId, doctorId, date, timeSlot, reason } = body;
            if (!patientId || !doctorId || !date || !timeSlot) {
              return sendJson(400, { error: 'Missing required appointment parameters' });
            }

            const APPT_TIMES = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];
            if (!APPT_TIMES.includes(timeSlot)) {
              return sendJson(400, { error: 'Invalid time slot' });
            }

            const doctors = parseDoctors();
            const doc = doctors.find(d => d.id === doctorId);
            if (!doc) return sendJson(404, { error: 'Doctor not found' });
            if (doc.type === 'EMERGENCY_PHYSICIAN') {
              return sendJson(400, { error: 'Emergency physicians cannot take routine appointments' });
            }

            const slotKey = `${date}|${timeSlot}`;
            if (doc.bookedSlots && doc.bookedSlots[slotKey]) {
              return sendJson(400, { error: `Slot ${timeSlot} on ${date} is already booked` });
            }

            const appts = parseAppointments();
            // Check patient collision on same date & time
            const patientConflict = appts.find(a =>
              a.patientId === patientId &&
              a.date === date &&
              a.timeSlot === timeSlot &&
              a.status !== 'CANCELLED'
            );
            if (patientConflict) {
              return sendJson(400, { error: `You already have an appointment at ${timeSlot} on ${date}` });
            }

            const id = genId('APT', 'appointments.txt');
            const bookedAt = nowTimestamp();
            const newAppt = {
              id,
              patientId,
              doctorId: doc.id,
              specialization: doc.specialization,
              date,
              timeSlot,
              reason: reason || 'General Consultation',
              status: 'CONFIRMED',
              bookedAt
            };

            // Add slot to doctor and save
            doc.bookedSlots[slotKey] = id;
            writeLines('doctors.txt', doctors.map(serializeDoctor));
            appendLine('appointments.txt', serializeAppointment(newAppt));

            return sendJson(200, { success: true, appointment: newAppt });
          }

          // --- APPOINTMENTS: CANCEL ---
          if (pathname.match(/^\/api\/appointments\/([^/]+)\/cancel$/) && req.method === 'POST') {
            const apptId = pathname.split('/')[3];
            const appts = parseAppointments();
            const appt = appts.find(a => a.id === apptId);
            if (!appt) return sendJson(404, { error: 'Appointment not found' });
            if (appt.status === 'CANCELLED') return sendJson(400, { error: 'Already cancelled' });
            if (appt.status === 'COMPLETED') return sendJson(400, { error: 'Completed appointments cannot be cancelled' });

            appt.status = 'CANCELLED';
            writeLines('appointments.txt', appts.map(serializeAppointment));

            // free slot in doctor
            const doctors = parseDoctors();
            const doc = doctors.find(d => d.id === appt.doctorId);
            if (doc && doc.bookedSlots) {
              const slotKey = `${appt.date}|${appt.timeSlot}`;
              delete doc.bookedSlots[slotKey];
              writeLines('doctors.txt', doctors.map(serializeDoctor));
            }

            return sendJson(200, { success: true, message: 'Appointment cancelled' });
          }

          // --- APPOINTMENTS: MARK COMPLETE ---
          if (pathname.match(/^\/api\/appointments\/([^/]+)\/complete$/) && req.method === 'POST') {
            const apptId = pathname.split('/')[3];
            const appts = parseAppointments();
            const appt = appts.find(a => a.id === apptId);
            if (!appt) return sendJson(404, { error: 'Appointment not found' });
            if (appt.status === 'CANCELLED') return sendJson(400, { error: 'Cannot complete a cancelled appointment' });

            appt.status = 'COMPLETED';
            writeLines('appointments.txt', appts.map(serializeAppointment));
            return sendJson(200, { success: true, message: 'Appointment marked completed' });
          }

          // --- EMERGENCIES: LIST ---
          if (pathname === '/api/emergencies' && req.method === 'GET') {
            const emergencies = parseEmergencies();
            return sendJson(200, { emergencies });
          }

          // --- EMERGENCIES: SUBMIT ---
          if (pathname === '/api/emergencies' && req.method === 'POST') {
            const { patientId, cityId, category, severity } = body;
            if (!patientId || cityId === undefined || !category || !severity) {
              return sendJson(400, { error: 'Missing emergency request parameters' });
            }

            const id = genId('EMG', 'emergencies.txt');
            const ep = nowEpoch();
            const existing = parseEmergencies();
            const nextSeq = (existing.reduce((max, e) => Math.max(max, e.seqNum || 0), 0)) + 1;
            const newEmg = {
              id,
              patientId,
              cityId: parseInt(cityId, 10),
              category,
              severity,
              severityVal: SEVERITY_VALS[severity] || 4,
              requestTimestamp: nowTimestamp(),
              epochTime: ep,
              seqNum: nextSeq,
              assignedAmbId: '',
              physician1Id: '',
              physician2Id: '',
              status: 'PENDING',
              outboundRoute: '',
              returnRoute: '',
              distanceKm: 0,
              completedAt: ''
            };

            appendLine('emergencies.txt', serializeEmergency(newEmg));
            return sendJson(200, { success: true, emergency: newEmg });
          }

          // --- EMERGENCIES: DISPATCH NEXT ---
          if (pathname === '/api/emergencies/dispatch-next' && req.method === 'POST') {
            const emergencies = parseEmergencies();
            const pending = emergencies.filter(e => e.status === 'PENDING');
            if (pending.length === 0) {
              return sendJson(400, { error: 'No pending emergencies in the queue' });
            }

            // Priority queue comparator
            pending.sort((a, b) => {
              if (a.severityVal !== b.severityVal) return a.severityVal - b.severityVal;
              if (a.epochTime !== b.epochTime) return a.epochTime - b.epochTime;
              return a.seqNum - b.seqNum;
            });
            const topEmg = pending[0];

            // Check ambulance availability
            const ambulances = parseAmbulances();
            const availableAmb = ambulances.find(a => a.status === 'AVAILABLE');
            if (!availableAmb) {
              return sendJson(400, { error: 'No ambulances available. Emergency remains pending.' });
            }

            // Check EP availability (need 2)
            const doctors = parseDoctors();
            const availableEPs = doctors.filter(d => d.type === 'EMERGENCY_PHYSICIAN' && d.available);
            if (availableEPs.length < 2) {
              return sendJson(400, { error: 'All emergency physicians are occupied. New emergency requests remain pending.' });
            }

            // Calculate route
            const graph = getGraph();
            const HOSPITAL_CITY_ID = 0;
            if (!graph.cities[topEmg.cityId]) {
              return sendJson(400, { error: `Patient city ID ${topEmg.cityId} not found in road network` });
            }

            const outPath = shortestPath(graph, HOSPITAL_CITY_ID, topEmg.cityId);
            if (outPath.length === 0) {
              return sendJson(400, { error: `No route found from hospital to city ${graph.cities[topEmg.cityId]?.name}. Emergency remains pending.` });
            }
            const retPath = shortestPath(graph, topEmg.cityId, HOSPITAL_CITY_ID);
            const { dist } = dijkstra(graph, HOSPITAL_CITY_ID);
            const distanceKm = dist[topEmg.cityId];

            // Atomic allocation
            const ep1 = availableEPs[0];
            const ep2 = availableEPs[1];
            ep1.available = false;
            ep1.assignedEmergId = topEmg.id;
            ep2.available = false;
            ep2.assignedEmergId = topEmg.id;

            availableAmb.status = 'DISPATCHED';
            availableAmb.assignedEmergId = topEmg.id;
            availableAmb.currentCityId = topEmg.cityId;

            topEmg.assignedAmbId = availableAmb.id;
            topEmg.physician1Id = ep1.id;
            topEmg.physician2Id = ep2.id;
            topEmg.outboundRoute = formatPath(graph, outPath);
            topEmg.returnRoute = formatPath(graph, retPath);
            topEmg.distanceKm = distanceKm;
            topEmg.status = 'DISPATCHED';

            // Persist all
            writeLines('doctors.txt', doctors.map(serializeDoctor));
            writeLines('ambulances.txt', ambulances.map(serializeAmbulance));
            writeLines('emergencies.txt', emergencies.map(serializeEmergency));

            return sendJson(200, {
              success: true,
              dispatchedEmergency: topEmg,
              ambulance: availableAmb,
              physicians: [ep1.name, ep2.name]
            });
          }

          // --- EMERGENCIES: COMPLETE MISSION ---
          if (pathname.match(/^\/api\/emergencies\/([^/]+)\/complete$/) && req.method === 'POST') {
            const emergId = pathname.split('/')[3];
            const emergencies = parseEmergencies();
            const emg = emergencies.find(e => e.id === emergId);
            if (!emg) return sendJson(404, { error: 'Emergency not found' });
            if (emg.status !== 'DISPATCHED') {
              return sendJson(400, { error: `Emergency ${emergId} is not currently DISPATCHED` });
            }

            // Release ambulance
            const ambulances = parseAmbulances();
            const amb = ambulances.find(a => a.id === emg.assignedAmbId);
            if (amb) {
              amb.status = 'AVAILABLE';
              amb.assignedEmergId = 'NONE';
              amb.currentCityId = 0;
              writeLines('ambulances.txt', ambulances.map(serializeAmbulance));
            }

            // Release physicians
            const doctors = parseDoctors();
            for (const doc of doctors) {
              if (doc.id === emg.physician1Id || doc.id === emg.physician2Id) {
                doc.available = true;
                doc.assignedEmergId = 'NONE';
              }
            }
            writeLines('doctors.txt', doctors.map(serializeDoctor));

            emg.status = 'COMPLETED';
            emg.completedAt = nowTimestamp();
            writeLines('emergencies.txt', emergencies.map(serializeEmergency));

            return sendJson(200, { success: true, message: `Emergency ${emergId} completed. Resources returned.` });
          }

          // --- PATIENTS DIRECTORY (ADMIN) ---
          if (pathname === '/api/patients' && req.method === 'GET') {
            const users = parseUsers().filter(u => u.role === 'PATIENT').map(({ hash, ...u }) => u);
            return sendJson(200, { patients: users });
          }

          // --- SYSTEM AGGREGATE STATS ---
          if (pathname === '/api/stats' && req.method === 'GET') {
            const users = parseUsers();
            const patients = users.filter(u => u.role === 'PATIENT').length;
            const doctors = parseDoctors();
            const specialistDocs = doctors.filter(d => d.type === 'SPECIALIST').length;
            const epDocs = doctors.filter(d => d.type === 'EMERGENCY_PHYSICIAN');
            const epAvail = epDocs.filter(d => d.available).length;
            const epBusy = epDocs.length - epAvail;

            const ambulances = parseAmbulances();
            const ambAvail = ambulances.filter(a => a.status === 'AVAILABLE').length;
            const ambBusy = ambulances.length - ambAvail;

            const emergencies = parseEmergencies();
            const emgPending = emergencies.filter(e => e.status === 'PENDING').length;
            const emgDisp = emergencies.filter(e => e.status === 'DISPATCHED').length;
            const emgComp = emergencies.filter(e => e.status === 'COMPLETED').length;

            const appointments = parseAppointments();
            const apptTotal = appointments.length;
            const apptConfirmed = appointments.filter(a => a.status === 'CONFIRMED').length;
            const apptCompleted = appointments.filter(a => a.status === 'COMPLETED').length;
            const apptCancelled = appointments.filter(a => a.status === 'CANCELLED').length;

            return sendJson(200, {
              patients,
              doctors: doctors.length,
              specialists: specialistDocs,
              ambulances: { total: ambulances.length, available: ambAvail, busy: ambBusy },
              emergencyPhysicians: { total: epDocs.length, available: epAvail, occupied: epBusy },
              emergencies: { total: emergencies.length, pending: emgPending, dispatched: emgDisp, completed: emgComp },
              appointments: { total: apptTotal, confirmed: apptConfirmed, completed: apptCompleted, cancelled: apptCancelled }
            });
          }

          return sendJson(404, { error: 'Endpoint not found' });
        } catch (err) {
          console.error('API Error:', err);
          return sendJson(500, { error: err.message || 'Internal server error' });
        }
      });
    }
  };
}
