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
app.use(express.static(path.join(__dirname, "templates")));

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

// New API endpoint for historical data
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

// Szerver indítás és adatlekérdezés
const startServer = async () => {
    // Adatok lekérése a szerver indításakor
    await fetchData();
    
    // Szerver indítása
    app.listen(PORT, () => {
        console.log(`Server running: http://127.0.0.1:${PORT}`);
        setTimeout(() => {
            open(`http://127.0.0.1:${PORT}`);
        }, 1000);
    });
};

// Szerver indítása
startServer();