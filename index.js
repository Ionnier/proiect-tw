const express = require('express');
const { Client } = require('pg');
app = express();


app.use("/resurse", express.static(__dirname + "/resurse"))
app.set("view engine", "ejs")

app.get(["/", "/index"], (req, res) => {
    res.render("pagini/index", {
        ip: req.ip,
    })
})

app.get("/*.ejs", (req, res) => {
    res.status(403).render("pagini/eroare_generala", { statuscode: 403, image: "/resurse/imagini/403.png", err: new Error("Forbidden") })
})

app.get("/*", (req, res) => {
    res.render(`pagini${req.url}`, (err, rezultatRender) => {
        if (err) {
            if (err.message.includes("Failed to lookup")) {
                res.status(404).render("pagini/eroare_generala", { statuscode: 404, image: "/resurse/imagini/404.png", err: err })
            } else {
                res.status(418).render("pagini/eroare_generala", { statuscode: 418, image: "/resurse/imagini/error.png", err: err })
            }
        }
        res.send(rezultatRender);
    });
});

console.log("Server-ul a pornit")
app.listen(3000)