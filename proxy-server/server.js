import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import open from "open";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "templates")));
const POSITIONS_FILE = path.join(__dirname, "templates","Positions.json");
const HOSTS_FILE = path.join(__dirname, "templates", "hosts.json");

const fetchData = async () => {
    try {
        const targetUrl = "http://mazsola.iit.uni-miskolc.hu/~qgeroli5/fgsz/index.php";
        console.log(`Fetching initial data from ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: "freshData"
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rawData = await response.text();
        const data = JSON.parse(rawData);
        
        const jsonFilePath = path.join(__dirname, "templates", "Data.json");
        fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2));
        console.log("Initial data successfully saved to Data.json");
        
        return data;
    } catch (error) {
        console.error("Error fetching initial data:", error);
        return null;
    }
};

async function fetchPositions() {
    try {
        const targetUrl = "http://mazsola.iit.uni-miskolc.hu/~qgeroli5/fgsz/index.php";
        console.log("Pozíciók lekérése szerverindításkor...");

        const response = await fetch(targetUrl, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: "positions"
        });

        if (!response.ok) {
            throw new Error(`HTTP hiba: ${response.status}`);
        }

        const positions = await response.json();

        const validPositions = {};
        for (const [ip, data] of Object.entries(positions)) {
            if (data.Latitude && data.Longitude) {
                validPositions[ip] = data;
            } else {
                console.warn(`Érvénytelen pozíció ${ip}-re`);
            }
        }

        fs.writeFileSync(POSITIONS_FILE, JSON.stringify(validPositions, null, 2));
        console.log("Pozíciók mentve a fájlba.");
    } catch (error) {
        console.error("Hiba a pozíciók lekérésekor:", error);
    }
}

async function fetchHosts() {
    try {
        const targetUrl = "http://mazsola.iit.uni-miskolc.hu/~qgeroli5/fgsz/index.php";
        console.log("Hosts lista lekérése szerverindításkor...");

        const response = await fetch(targetUrl, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: "hosts"
        });

        if (!response.ok) {
            throw new Error(`HTTP hiba: ${response.status}`);
        }

        const hosts = await response.json();

        fs.writeFileSync(HOSTS_FILE, JSON.stringify(hosts, null, 2));
        console.log("Hosts lista mentve a fájlba.");
    } catch (error) {
        console.error("Hiba a hosts lista lekérésekor:", error);
    }
}

app.post("/historical-data", async (req, res) => {
    try {
        const { hostid, property, start_datetime, end_datetime } = req.body;
        
        if (!hostid || !property || !start_datetime || !end_datetime) {
            return res.status(400).json({ 
                error: "Missing required parameters: hostid, property, start_datetime, end_datetime" 
            });
        }

        const targetUrl = "http://mazsola.iit.uni-miskolc.hu/~qgeroli5/fgsz/index.php";
        
        const formData = new URLSearchParams();
        formData.append('hostid', hostid);
        formData.append('property', property);
        formData.append('start_datetime', start_datetime);
        formData.append('end_datetime', end_datetime);

        console.log(`Fetching historical data from ${targetUrl} with params:`, {
            hostid,
            property,
            start_datetime,
            end_datetime
        });

        const response = await fetch(targetUrl, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error fetching historical data:", error);
        res.status(500).json({ 
            error: "Failed to fetch historical data",
            details: error.message 
        });
    }
});

// Proxy végpont (a meglévő)
app.post("/proxy", async (req, res) => {
    try {
        const data = await fetchData();
        if (!data) {
            throw new Error("Failed to fetch data");
        }
        res.json(data);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send(`Server error: ${error.message}`);
    }
});

// Alapértelmezett útvonal
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "templates", "main_page.html"));
});

// Adatvégpont
app.get("/data", (req, res) => {
    try {
        const jsonFilePath = path.join(__dirname, "templates", "Data.json");
        const fileContent = fs.readFileSync(jsonFilePath, "utf-8");
        const jsonData = JSON.parse(fileContent);
        res.json(jsonData);
    } catch (error) {
        console.error("Error reading data file:", error);
        res.status(500).json({ error: "Error reading data file" });
    }
});
// Pozició végpont
app.get("/positions", (req, res) => {
    try {
        if (!fs.existsSync(POSITIONS_FILE)) {
            return res.status(404).json({ error: "Pozíciós fájl nem található." });
        }

        const data = fs.readFileSync(POSITIONS_FILE, "utf-8");
        const json = JSON.parse(data);
        res.json(json);
    } catch (error) {
        console.error("Hiba a fájl olvasásakor:", error);
        res.status(500).json({ error: "Nem sikerült beolvasni a pozíciós adatokat." });
    }
});
// Hosts végpont
app.get("/hosts", (req, res) => {
    try {
        if (!fs.existsSync(HOSTS_FILE)) {
            return res.status(404).json({ error: "Hosts fájl nem található." });
        }

        const data = fs.readFileSync(HOSTS_FILE, "utf-8");
        const json = JSON.parse(data);
        res.json(json);
    } catch (error) {
        console.error("Hiba a hosts fájl olvasásakor:", error);
        res.status(500).json({ error: "Nem sikerült beolvasni a hosts adatokat." });
    }
});

// Szerver indítás és adatlekérdezés
const startServer = async () => {
    //fetchData();
    fetchPositions();
    fetchHosts();

    app.listen(PORT, () => {
        console.log(`Server running: http://127.0.0.1:${PORT}`);
        setTimeout(() => {
            open(`http://127.0.0.1:${PORT}`);
        }, 1000);
        /*
        setInterval(async () => {
            await fetchData();
        }, 60 * 1000);
        */
    });
};

startServer();