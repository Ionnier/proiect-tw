require('dotenv').config()
const express = require('express');
const { Client } = require('pg');
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const sass = require('sass')
const ejs = require('ejs')
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: false})
client.connect()
client.query("select enum_range(null::categorii_produse)", (err, res) => {
    if (err) {
        console.log(err)
    } else {
        categories = res.rows[0].enum_range.slice(1, -1).split(",")
        for (let i = 0; i < categories.length; i++) {
            if (categories[i][0] == `"`) {
                categories[i] = categories[i].slice(1, -1)
            }
        }
        categories.splice(0, 0, "Toate")
        header = fs.readFileSync(path.join(__dirname, "views", "fragmente", "header_template.ejs")).toString("utf-8")
        to_add = ""
        for(categorie of categories){
            to_add += `<li><a href="${categorie}"> ${categorie} </a> </li>\n`
        }
        header = header.replace("%$!@#$LISTA_PRODUSE%!@#$%@",to_add)
        fs.writeFileSync(path.join(__dirname, "views", "fragmente", "header.ejs"),header)
        console.log(categories)
    }
})
app = express();

app.use("/resurse", express.static(__dirname + "/resurse"))
app.set("view engine", "ejs")

function getAnotimp() {
    let curr_month = new Date().getMonth() + 1
    if (curr_month == 1 || curr_month == 2 || curr_month == 12) {
        return "iarna"
    }
    if (curr_month == 3 || curr_month == 4 || curr_month == 5) {
        return "primavara"
    }
    if (curr_month == 6 || curr_month == 7 || curr_month == 8) {
        return "vara"
    }
    if (curr_month == 9 || curr_month == 10 || curr_month == 11) {
        return "toamna"
    }
}
const jsonGalerie = fs.readFileSync(path.join(__dirname, "resurse", "json", "galerie.json")).toString("utf-8")
const imaginiJSON = JSON.parse(jsonGalerie)

for (let imag of imaginiJSON.imagini) {
    let [nume_imag, extensie] = imag.cale_fisier.split(".")
    let dim_mic = 150
    imag.mic = `${imaginiJSON.cale_galerie}/mic/${nume_imag}-${dim_mic}.${extensie}`
    imag.mare = `${imaginiJSON.cale_galerie}/${nume_imag}.${extensie}`
    if (!fs.existsSync(path.join(__dirname, imag.mic))) {
        sharp(path.join(__dirname, imag.mare)).resize(dim_mic).toFile(path.join(__dirname, imag.mic))
    }
}

app.get("*/galerie_animata.css/:photos", (req, res) => {
    res.setHeader("Content-Type", "text/css");
    let sirScss = fs.readFileSync(path.join(__dirname, "resurse", "scss", "galerie_animata.scss")).toString("utf-8")
    culori = ["navy", "black"]
    let culoateAleatoare = culori[Math.floor(Math.random() * culori.length)]
    let rezScss = ejs.render(sirScss, { culoare: culoateAleatoare, nr_poze: req.params.photos || 13 })
    fs.writeFileSync(path.join(__dirname, "temp", "galerie_animata.scss"), rezScss)
    let cale_scss = path.join(__dirname, "temp", "galerie_animata.scss")
    let cale_css = path.join(__dirname, "temp", "galerie_animata.css")
    sass.render({ file: cale_scss, sourceMap: true }, (err, rez) => {
        if (err) {
            console.log(err)
            res.end()
            return;
        }
        fs.writeFileSync(cale_css, rez.css, (err) => {
            if (err) {
                console.log(err)
            }
        })
        res.sendFile(cale_css)
    })
})

app.get("*/galerie_animata.css.map", (req, res) => {
    res.sendFile(path.join(__dirname, "temp", "galerie_animata.css.map"))
})

function getGalerie(nr_poze = 13) {
    let new_imag_array = []
    let curr_anotimp = getAnotimp();
    for (let imag of imaginiJSON.imagini) {
        if (imag.anotimp == curr_anotimp)
            new_imag_array.push(imag)
    }
    max_index = Math.min(new_imag_array.length, nr_poze)
    max_array = [];
    while (max_array.length < max_index) {
        random_int = Math.floor(Math.random() * new_imag_array.length)
        if (!(max_array.includes(random_int))) {
            max_array.push(random_int)
        }
    }
    galerie_statica = []
    for (i of max_array) {
        galerie_statica.push(new_imag_array[i])
    }
    return galerie_statica
}

app.get("/galerie", (req, res) => {
    res.render("pagini/galerie", {
        imagini: getGalerie(13),
        cale: imaginiJSON.cale_galerie
    })
})

app.get("/produse", (req, res) => {
    client.query("select * from produs", (err, data) => {
        if (err) {
            console.log(err)
        } else {
            console.log(data)
            res.render("pagini/produse", {produse: data.rows})
        }
    })
})

app.get(["/", "/index"], (req, res) => {
    res.render("pagini/index", {
        ip: req.ip,
        imagini: getGalerie(13),
        imagini_animate: getGalerie(Math.floor(Math.random() * 6) + 6),
        cale: imaginiJSON.cale_galerie
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

// cale = path.join("C:", "Users", "Dragos", "Desktop", "tlou2")
// //cale = path.join("C:", "Users", "Dragos", "Downloads", "Seasons", "Seasons", "Winter - Nier Automata")
// fs.readdir(cale, (err, files) => {
//     for (file of files) {
//         // sharp(path.join(cale, file)).resize(400).toFile(path.join("C:", "Users", "Dragos", "Desktop", "tlou2", `${file.split(".")[0]}.webp`)).then((res, err) => {
//         //     console.log(err)
//         // })
//         const object = {
//             cale_fisier: file, titlu: file.split("_")[0], text_descriere: file.split(".")[0], anotimp: "toamna", copyright: {
//                 link: "https://psnprofiles.com/ChibiiiFox",
//                 name: "ChibiiiFox"
//             }
//         }
//         console.log(JSON.stringify(object) + ",")
//     }
//     console.log(files)
// })

console.log("Server-ul a pornit")
app.listen(process.env.PORT || 3000)