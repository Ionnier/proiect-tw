require('dotenv').config()
const express = require('express');
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const sass = require('sass')
const ejs = require('ejs');
const formidable = require('formidable')
const session = require('express-session');
const QRCode = require('qrcode')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const emailvalidator = require('email-validator')
const mv = require('mv')
const mime = require('mime');
const cors = require('cors')
const xss = require('xss')
const requests = require('request')
const html_to_pdf = require('html-pdf-node');

function sanitizeText(string) {
    return xss(string);
}

if (!fs.existsSync(path.join(__dirname, "temp"))) {
    fs.mkdirSync(path.join(__dirname, "temp"));
}
if (process.env.DATABASE_URL.includes("localhost")) {
    var protocol = 'http://'
    var domeniu = `localhost:${process.env.PORT || 3000}`
} else {
    var protocol = 'https://'
    var domeniu = process.env.DOMAIN_NAME
}
let caleQr = path.join(__dirname, "resurse", "imagini", "qrcode")
if (fs.existsSync(caleQr)) {
    fs.rmSync(caleQr, { force: true, recursive: true })
}
fs.mkdirSync(caleQr, { recursive: true })

function generateQRCode(id) {
    return new Promise((resolve, reject) => {
        let websiteLink = `${protocol}${domeniu}/produs/articol_${id}`
        console.log(path.join(caleQr, `${id}.png`))
        console.log(websiteLink)
        QRCode.toFile(path.join(caleQr, `${id}.png`), websiteLink, (err) => {
            if (err) {
                console.log(err)
                reject(err)
            }
            resolve(true)
        })
    })
}

const client = require('./db').db;
const { response } = require('express');
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
        for (categorie of categories) {
            to_add += `<li><a href="/produse/${categorie.toLowerCase().replace(" ", "-")}"> ${categorie} </a> </li>\n`
        }
        header = header.replace("<!--%$!@#$LISTA_PRODUSE%!@#$%@!-->", to_add)
        fs.writeFileSync(path.join(__dirname, "views", "fragmente", "header.ejs"), header)
    }
})

var ocupatii
const pref_not = "Prefer sa nu spun"
client.query("select enum_range(null::ocupatii)", (err, res) => {
    if (err) {
        console.log(err)
    } else {
        ocupatii = res.rows[0].enum_range.slice(1, -1).split(",")
        for (let i = 0; i < ocupatii.length; i++) {
            if (ocupatii[i][0] == `"`) {
                ocupatii[i] = ocupatii[i].slice(1, -1)
            }
        }
    }
})

app = express();
app.use(session({
    secret: 'abcdefg',//folosit de express session pentru criptarea id-ului de sesiune
    resave: true,
    saveUninitialized: false
}));
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
const randomColor = () => {
    let color = '#';
    for (let i = 0; i < 6; i++) {
        const random = Math.random();
        const bit = (random * 16) | 0;
        color += (bit).toString(16);
    };
    return color;
};

app.get('*/body.css', (req, res) => {
    res.setHeader("Content-Type", "text/css")
    let sirCss = fs.readFileSync(path.join(__dirname, "resurse", "css", "body.css")).toString("utf-8")
    let luck_colors = `--color_default: ${randomColor()};` + `--og_color_default_light: ${randomColor()};` + `--og_color_default_darker: ${randomColor()};` + `--color_default_light: ${randomColor()};` + `--color_default_darker: ${randomColor()};` + `--color_alternative: ${randomColor()};` + `--color_alternative_lighter: ${randomColor()};` + `--text-color-ligth: ${randomColor()};` + `--text-color-dark: ${randomColor()};`
    res.send(sirCss.replace('<%%$COLORS$%%>', luck_colors))
})
app.use("/resurse", express.static(__dirname + "/resurse"))
app.set("view engine", "ejs")
app.use(require('helmet').frameguard())

app.use("/*", (req, res, next) => {
    if (process.env.MENTENANTA && process.env.MENTENANTA.toLowerCase() === 'true') {
        res.send('Mentenanta');
        res.end()
        return
    } else {
        res.locals.utilizator = req.session.utilizator
        res.locals.map_box_key = process.env.MAPBOX_KEY
        next()
    }
})


function getIp(req) {
    var ip = req.headers["x-forwarded-for"];
    if (ip) {
        let vect = ip.split(",");
        return vect[vect.length - 1];
    }
    else if (req.ip) {
        return req.ip;
    }
    else {
        return req.connection.remoteAddress;
    }
}


// ????????????????????????????????
// app.use((req, res, next) => {
//     if (req.ip) {
//         client.query(`insert into accesari(ip, user_id, pagina) values($1::text, $2, $3::text)`, [
//             req.ip,
//             (req.session.utilizator) ? req.session.utilizator.id : null,
//             req.url
//         ], (err) => {
//             if (err) {
//                 return next(err)
//             }
//             next()
//         }
//         )
//     }
// })
// ?????????????????????????????????

var ipuri_active = {};

app.use((req, res, next) => {
    let ipReq = getIp(req);
    let ip_gasit = ipuri_active[ipReq + "|" + req.url];
    //console.log("=================", ip_gasit, ipuri_blocate);
    timp_curent = new Date();
    if (ip_gasit) {
        if ((timp_curent - ip_gasit.data) < 5 * 1000) {//diferenta e in milisecunde; verific daca ultima accesare a fost pana in 10 secunde
            if (ip_gasit.nr > 3) {//mai mult de 10 cereri 
                res.send("<h1>Prea multe cereri intr-un interval scurt. Ia te rog sa fii cuminte, da?!</h1>");
                ip_gasit.data = timp_curent
                return;
            }
            else {
                ip_gasit.data = timp_curent;
                ip_gasit.nr++;
            }
        }
        else {
            //console.log("Resetez: ", req.ip+"|"+req.url, timp_curent-ip_gasit.data)
            ip_gasit.data = timp_curent;
            ip_gasit.nr = 1;//a trecut suficient timp de la ultima cerere; resetez
        }
    }
    else {
        //nu mai folosesc baza de date fiindca e prea lenta
        //var queryIp=`select ip, data_accesare from accesari where (now() - data_accesare < interval '00:00:05' ) and ip='${req.ip}' and pagina='${req.url}' `;
        //console.log(queryIp);
        /*
        client.query(queryIp, function(err,rez){
            //console.log(err, rez);
            if (!err){
                if(rez.rowCount>4)
                    {res.send("<h1>Ia te rog sa fii cuminte, da?!</h1>");
                    let ip_gasit=ipuri_blocate.find(function(elem){ return elem.ip==req.ip});
                    if(!ip_gasit)
                        ipuri_blocate.push({ip:req.ip, data:new Date()});
                    //console.log("ipuri_blocate: ",ipuri_blocate);
                    return;
                    }
        */

        ipuri_active[ipReq + "|" + req.url] = { nr: 1, data: timp_curent };
        //console.log("am adaugat ", req.ip+"|"+req.url);
        //console.log(ipuri_active);
    }
    let comanda_param = `insert into accesari(ip, user_id, pagina) values ($1::text, $2,  $3::text)`;
    //console.log(comanda);
    if (ipReq) {
        var id_utiliz = req.session.utilizator ? req.session.utilizator.id : null;
        //console.log("id_utiliz", id_utiliz);
        client.query(comanda_param, [ipReq, id_utiliz, req.url], function (err, rez) {
            if (err) console.log(err);
        });
    }
    next();
});

/*
var ipuri_blocate = []
app.use((req, res, next) => {
    let ip_gasit = ipuri_blocate.find((elem) => { return elem.ip = req.ip })
    if (ip_gasit) {
        return res.end('Too many requests.')
    }
    var queryIp = `select ip, data_accesare from accesari where(now()-data_accesare<interval '00:00:15') and ip=$1 and pagina=$2`
    client.query(queryIp, [req.ip, req.url], (err, data) => {
        if (err) {
            return next(err)
        }
        if (data.rowCount > 5) {
            res.end('Too many requests.')
            let ip_gasit = ipuri_blocate.find((elem) => { return elem.ip == req.ip })
            if (!ip_gasit)
                ipuri_blocate.push({ ip: req.ip, data: new Date() })
            return
        } else {
            next()
        }
    })
})
*/
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

app.get("/produs/:id/", (req, res) => {
    if (req.params.id && req.params.id.split("_").length == 2 && req.params.id.split("_")[0] == "articol") {
        req.params.id = req.params.id.split("_")[1]
        client.query("select * from Produse where id = $1", [req.params.id], (err, data) => {
            if (err) {
                res.status(418).render("pagini/eroare_generala", { statuscode: 418, image: "/resurse/imagini/error.png", err: err })
                return;
            } else {
                if (data.rows.length == 1) {
                    res.render("pagini/pag_produs", { produs: data.rows[0] })
                    return;
                }
                else {
                    res.status(418).render("pagini/eroare_generala", { statuscode: 418, image: "/resurse/imagini/error.png", err: err })
                    return;
                }
            }
        })
    }
    else {
        res.status(404).render("pagini/eroare_generala", { statuscode: 404, image: "/resurse/imagini/404.png", err: new Error("Failed to lookup view") })
        return;
    }
})

app.get(["/produse", "/produse/:categorie/"], (req, res) => {
    query = "select * from Produse where 1 = 1 "
    args = []
    if (!(req.params.categorie == 'toate' || req.params.categorie == undefined)) {
        query += "and replace(lower(categorie::varchar),' ','-') = $1"
        args.push(req.params.categorie)
    }
    client.query(query, args, (err, data) => {
        if (err) {
            console.log(err)
        } else {
            v_optiuni = []
            for (let row of data.rows) {
                if (!(row.tip_produs in v_optiuni)) {
                    v_optiuni.push(row.tip_produs)
                }
            }
            v_optiuni = new Set(v_optiuni)
            res.render("pagini/produse", { produse: data.rows, optiuni: v_optiuni })
        }
    })
})
var lansari_produse = []
client.query('select * from produse p where EXTRACT(MONTH FROM data_lansare) = extract(month from now()) and EXTRACT(YEAR FROM data_lansare) = EXTRACT(year FROM now())', (err, data) => {
    if (data) {
        for (x of data.rows) {
            lansari_produse.push({ data: new Date(x.data_lansare.getFullYear(), x.data_lansare.getMonth(), x.data_lansare.getDay()), text: `Lansare ${x.nume}` })
        }
    }
})


app.get(["/", "/index"], (req, res) => {
    client.query("select username, nume, prenume, (select case when now()-data_accesare < interval '5 minutes' then 'ACTIV' else 'INACTIV' end activity from accesari where user_id =u.id order by data_accesare desc limit 1) from utilizatori u where id in (select distinct user_id from accesari where now() - data_accesare < interval '10 minutes')").then(function (rezultat) {
        requests.get(`http://www.geoplugin.net/json.gp?ip=${getIp(req)}`, (err, response, data) => {
            if (err) console.log(err)
            data = JSON.parse(data)

            //generare evenimente random pentru calendar 
            var evenimente = lansari_produse
            var texteEvenimente = ["Eveniment important", "Festivitate"];
            dataCurenta = new Date();
            for (i = 0; i < texteEvenimente.length; i++) {
                evenimente.push({ data: new Date(dataCurenta.getFullYear(), dataCurenta.getMonth(), Math.ceil(Math.random() * 27)), text: texteEvenimente[i] });
            }

            res.render("pagini/index", {
                evenimente: evenimente,
                utiliz_online: rezultat.rows,
                ip: req.ip,
                lat: data.geoplugin_latitude,
                long: data.geoplugin_longitude,
                imagini: getGalerie(13),
                imagini_animate: getGalerie(Math.floor(Math.random() * 6) + 6),
                cale: imaginiJSON.cale_galerie
            })
        })
    })

})

setInterval(() => {
    client.query(`DELETE from public.accesari where now()-data_accesare > interval '24 hours'`)
}, 1000 * 60 * 60)

app.get("/*.ejs", (req, res) => {
    res.status(403).render("pagini/eroare_generala", { statuscode: 403, image: "/resurse/imagini/403.png", err: new Error("Forbidden") })
})

app.use("/api/v1/postari", require("./routers/postariRouter"))
app.use("/api/v1/comentarii/", require("./routers/comentariiRouter"))

app.post("/produse_cos", function (req, res) {
    //console.log("req.body: ",req.body);
    //console.log(req.get("Content-type"));
    //console.log("body: ",req.get("body"));
    /* prelucrare pentru a avea toate id-urile numerice si pentru a le elimina pe cele care nu sunt numerice */
    var iduri = []
    for (let elem of req.body.ids_prod) {
        let num = parseInt(elem);
        if (!isNaN(num))//daca este numar
            iduri.push(num);
    }
    if (iduri.length == 0) {
        res.send("eroare");
        return;
    }
    //console.log("select id, nume, pret, gramaj, calorii, categorie, imagine from prajituri where id in ("+iduri+")");
    client.query("select id, nume, pret, img from produse where id in (" + iduri + ")", function (err, rez) {
        //console.log(err, rez);
        //console.log(rez.rows);
        res.send(rez.rows);
    });
});



app.get("/forum", (req, res) => {
    client.query("SELECT * from lista_postari", (err, data) => {
        if (err) {
            console.log(err)
            res.status(418).render("pagini/eroare_generala", { statuscode: 418, image: "/resurse/imagini/418.png", err: err })
            return;
        } else {
            res.render("pagini/forum", { postari: data.rows })
            return;
        }
    })
})

app.get("/forum/:id/", (req, res) => {
    client.query("SELECT * from postari where id_postare=$1", [req.params.id], (err, data) => {
        if (err) {
            console.log(err)
            res.status(418).render("pagini/eroare_generala", { statuscode: 418, image: "/resurse/imagini/418.png", err: err })
            return;
        } else {
            client.query("SELECT * from comentarii where id_postare=$1 order by data_publicare desc", [req.params.id], (err, data2) => {
                if (err) {
                    res.status(418).render("pagini/eroare_generala", { statuscode: 418, image: "/resurse/imagini/418.png", err: err })
                    return;
                } else {
                    res.render("pagini/postare", { postare: data.rows[0], comentarii: data2.rows })
                    return;
                }
            })
        }
    })
})

async function trimiteMail(email, subject, text, html, attachments) {
    let options
    if (process.env.EMAIL_ACCOUNT.includes("gmail")) {
        options = {
            service: "gmail",
            secure: false,
            auth: {
                user: process.env.EMAIL_ACCOUNT,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            }
        }
    } else {
        options = {
            host: "smtp.mailtrap.io",
            port: 2525,
            auth: {
                user: process.env.EMAIL_ACCOUNT,
                pass: process.env.EMAIL_PASSWORD
            }
        }
    }
    let transporter = nodemailer.createTransport(options);
    await transporter.sendMail({
        from: `"Proiect Tehnici Web" <${process.env.EMAIL_ACCOUNT}>`,
        to: email,
        subject,
        text,
        html,
        attachments
    })
}


function generateSalt(length = 50) { // genereaza salt-ul pentru criptarea parolelor
    return crypto.randomBytes(length).toString('hex')
}

function hashStringWithSalt(string, salt = undefined) {
    return crypto.createHmac("sha512", salt).update(string).digest('hex');
}

function mv_file(old_path, new_path) {
    return new Promise((resolve, reject) => {
        mv(old_path, new_path, (err) => {
            if (err) {
                reject(err)
            }
            resolve(true)
        })
    })
}


app.use((req, res, next) => {
    if (req.path.includes("/inregistrare") || req.path.includes("/profil")) {
        res.locals.ocupatii = ocupatii
        res.locals.ocupatie_default = pref_not
    }
    next()
})



app.post("/inreg", async (req, res) => {
    var formular = new formidable.IncomingForm();
    formular.parse(req, async (err, campuriText, campuriFile) => {
        for ([key, value] of Object.entries(campuriText)) {
            campuriText[key] = sanitizeText(value)
        }
        //console.log(campuriText);
        function validateText(text, regex) {
            if (text == "") {
                return [false, "String-ul este gol."]
            }
            if (text == undefined) {
                return [false, "String-ul este undefined."]
            }
            if (text.size == 0) {
                return [false, "String-ul nu are size."]
            }
            if (regex == undefined) {
                return [true, ""]
            } else {
                if (text.match(regex))
                    return [true, ""]
                else
                    return [false, "Regex-ul nu este validat"]
            }
        }
        var err = ""
        function validate(text, camp, regex) {
            var rez_bool, rez_err
            [rez_bool, rez_err] = validateText(text, regex)
            if (!rez_bool) {
                err += `${camp}: ${rez_err}`
            }
        }
        validate(campuriText.username, "Username", "^[A-Za-z0-9]+$")
        validate(campuriText.nume, "Nume", "^([A-Z][a-z]{2,}(-[A-Z][a-z]{2,})*)$")
        validate(campuriText.prenume, "Prenume", "^([A-Z][a-z]{2,}(-[A-Z][a-z]{2,})*)$")
        //validate(campuriText.parola, "Parola", "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])")
        if (!emailvalidator.validate(campuriText.email)) {
            err += "Eroare validare email."
        }
        if (err == "") {
            let userSalt = generateSalt()
            let userPassword = hashStringWithSalt(campuriText.parola, userSalt)
            let ocupatie = campuriText.ocupatie == pref_not ? undefined : campuriText.ocupatie
            let file_path = undefined
            let resource_path = "/resurse/imagini/def_profile_pic.png"
            if (campuriFile) {//&& !campuriFile.poza.length && mime.getType(campuriFile.poza.originalFilename).includes("image")) {
                let folderUtilzitaor = path.join(__dirname, "resurse", "poze_utilizatori", campuriText.username)
                if (!fs.existsSync(folderUtilzitaor))
                    fs.mkdirSync(folderUtilzitaor, { recursive: true })
                let v = campuriFile.poza.originalFilename.split(".")
                file_path = path.join(folderUtilzitaor, `poza.${v[v.length - 1]}`)
                try {
                    await mv_file(campuriFile.poza.filepath, file_path)
                    resource_path = file_path.replace(__dirname, "").replace(/\\/g, "/")
                }
                catch (err) {
                    console.log(err)
                    file_path = undefined
                }
            }
            let token = `${generateSalt(4)}${hashStringWithSalt(campuriText.username, domeniu).substring(0, 40)}`
            client.query("INSERT INTO public.utilizatori (username, nume, prenume, \
                     parola, email, culoare_chat, salt, ocupatie, poza_profil, confirmare_mail) \
                     VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
                [campuriText.username, campuriText.nume, campuriText.prenume,
                    userPassword, campuriText.email, campuriText.culoareText, userSalt, ocupatie, resource_path, token], async (err, data) => {
                        if (err) {
                            console.log(err)
                            if (err.code == 23505) {
                                res.render("pagini/inregistrare", { err: "Adresa de email sau parola exista deja." })
                            } else {
                                res.render("pagini/inregistrare", { err: "Eroare baza de date." })
                            }
                            if (file_path) {
                                fs.unlink(file_path)
                            }

                        } else {
                            link = `${protocol}${domeniu}/confirmare/${campuriText.username}/${token}`
                            subiect = `Cont nou`
                            text = `Bine ai venit în comunitatea Sandbadog.Username - ul tau este: ${campuriText.username}.Link de confirmare ${link}`
                            html = `<h1> Bine ai venit in comunitatea Sandbadog!</h1> ` +  
                                `<p> Username - ul tau este` + 
                                `<span style = "font-weight: bold; color: green;"> ` +
                                ` ${campuriText.username} ` +
                                `</span> ` +
                                `</p> ` +
                                `<p> Confirma mail - ul aici: <a href="${link}"> ${link}` +
                                `</a>` +
                                `</p>`
                            await trimiteMail(campuriText.email, subiect, text, html)
                            res.render("pagini/inregistrare", { raspuns: "Date adaugate cu succes. Te rog confirma mail-ul" })
                        }

                    }
            )
        } else {
            res.render("pagini/inregistrare", { err })
        }
    })
})

app.get("/confirmare/:username/:token/", (req, res) => {
    client.query("UPDATE public.Utilizatori set confirmare_mail=null where username=$1 and confirmare_mail=$2",
        [req.params.username, req.params.token], (err, data) => {
            if (err) {
                console.log(err)
                res.render("pagini/index", {
                    err: "Eroare la baza de date.", ip: req.ip,
                    imagini: getGalerie(13),
                    imagini_animate: getGalerie(Math.floor(Math.random() * 6) + 6),
                    cale: imaginiJSON.cale_galerie
                })
            } else {
                if (data.rowCount == 1) {
                    res.redirect("/index")
                } else {
                    res.render("pagini/index", {
                        err: "Confirmare mail nereusita.", ip: req.ip,
                        imagini: getGalerie(13),
                        imagini_animate: getGalerie(Math.floor(Math.random() * 6) + 6),
                        cale: imaginiJSON.cale_galerie
                    })
                }
            }
        })
})

app.post("/api/v1/trimiteMailParola/", async (req, res, next) => {
    if (!req.body.username) {
        return next(new Error('No body'))
    }
    if (req.body.username != sanitizeText(req.body.username))
        return res.status(403).json({ succes: false, message: `S-a incercat un atac XSS, cu ${sanitizeText(req.body.username)}` })
    let code = generateSalt(25)
    client.query(`UPDATE public.Utilizatori set resetare_parola=$1 where username=$2 RETURNING email`, [code, sanitizeText(req.body.username)], async (err, data) => {
        if (err) {
            console.log(err)
            return next(err)
        }
        if (data.rowCount == 1) {
            let subiect = `Cod resetare parola`
            let text = `Codul este ${code}`
            let link = `${protocol}${domeniu}/resetareparola?token=${code}`
            let html = `<h1> Salut </h1> <p>Codul este ${code}. Reseteaza parola la <a href="${link}"> ${link} </a> </p>`
            await trimiteMail(data.rows[0].email, subiect, text, html)
        }
        res.status(200).json({ success: true, message: 'Daca utilizatorul se potriveste cu unul in baza de date, vei primii un mail in curand' })
    })
})


app.post("/login", (req, res) => {
    var formular = new formidable.IncomingForm();
    formular.parse(req, (err, campuriText) => {
        for ([key, value] of Object.entries(campuriText)) {
            campuriText[key] = sanitizeText(value)
        }
        //console.log(req)
        //console.log(campuriText);
        var err = ""
        if (err == "") {
            client.query("SELECT * FROM public.utilizatori where username=$1",
                [campuriText.username], (err, data) => {
                    if (err) {
                        res.render("pagini/index", {
                            err: "Eroare baza de date.", ip: req.ip,
                            imagini: getGalerie(13),
                            imagini_animate: getGalerie(Math.floor(Math.random() * 6) + 6),
                            cale: imaginiJSON.cale_galerie
                        })
                    } else {
                        if (data.rows.length != 1) {
                            res.render("pagini/index", {
                                err: "Autentificare nereusita.", ip: req.ip,
                                imagini: getGalerie(13),
                                imagini_animate: getGalerie(Math.floor(Math.random() * 6) + 6),
                                cale: imaginiJSON.cale_galerie
                            })
                        } else {
                            let userPassword = hashStringWithSalt(campuriText.parola, data.rows[0].salt)
                            if (userPassword == data.rows[0].parola) {
                                if (!data.rows[0].confirmare_mail) {
                                    if (req.session) {
                                        req.session.utilizator = {
                                            id: data.rows[0].id,
                                            username: data.rows[0].username,
                                            nume: data.rows[0].nume,
                                            prenume: data.rows[0].prenume,
                                            culoare_chat: data.rows[0].culoare_chat,
                                            email: data.rows[0].email,
                                            rol: data.rows[0].rol,
                                            ocupatie: data.rows[0].ocupatie,
                                            poza_profil: data.rows[0].poza_profil
                                        }
                                    }
                                    res.redirect("/index")
                                } else {
                                    res.render("pagini/index", {
                                        err: "Mail neconfirmat.", ip: req.ip,
                                        imagini: getGalerie(13),
                                        imagini_animate: getGalerie(Math.floor(Math.random() * 6) + 6),
                                        cale: imaginiJSON.cale_galerie
                                    })

                                }

                            } else {
                                res.render("pagini/index", {
                                    err: "Autentificare nereusita.", ip: req.ip,
                                    imagini: getGalerie(13),
                                    imagini_animate: getGalerie(Math.floor(Math.random() * 6) + 6),
                                    cale: imaginiJSON.cale_galerie
                                })
                            }
                        }
                    }
                }
            )
        } else {
            res.render("pagini/index", {
                err, ip: req.ip,
                imagini: getGalerie(13),
                imagini_animate: getGalerie(Math.floor(Math.random() * 6) + 6),
                cale: imaginiJSON.cale_galerie
            })
        }
    })
})

priviliges = {
    'comun': 0,
    'moderator': 1,
    'admin': 2
}

function restrictTo(...roles) {
    if (roles.length > 1 || parseInt(roles[0]) == NaN) {
        return (req, res, next) => {
            if (req.session && req.session.utilizator && roles.includes(req.session.utilizator.rol)) {
                return next();
            } else {
                return next(
                    new Error('Not Enough Priviligies')
                );
            }
        };
    } else {
        return (req, res, next) => {
            if (req.session && req.session.utilizator && priviliges[req.session.utilizator.rol] >= parseInt(roles[0])) {
                return next()
            } else {
                return next(
                    new Error('Not Enough Priviligies')
                )
            }
        }
    }
};

function protect() {
    return (req, res, next) => {
        if (req.session && req.session.utilizator) {
            return next();
        } else {
            return next(
                new Error('Not Logged In')
            );
        }
    };
}

app.post('/api/v1/produs/:id/', restrictTo(1), (req, res, next) => {
    client.query('update produse set nume=$1, stoc=$2 where id=$3', [req.body.nume, req.body.stoc, req.params.id], (err, data) => {
        if (err)
            return next(err)
        if (data.rowCount == 1)
            return res.json({ success: true, message: 'updated' })
        return next({ succes: false, message: 'not updated' })
    })
})

app.get('/stoc', restrictTo(1), (req, res, next) => {
    client.query('select id, nume, stoc from produse', (err, data) => {
        if (err)
            return next(err)
        let fields = []
        for (x of data.fields) {
            fields.push(x.name)
        }
        res.render("pagini/stoc", { fields, users: data.rows })
    })

})

app.post("/profil", protect(), (req, res) => {
    var formular = new formidable.IncomingForm();
    formular.parse(req, async (err, campuriText, campuriFile) => {
        for ([key, value] of Object.entries(campuriText)) {
            campuriText[key] = sanitizeText(value)
        }
        function validateText(text, regex) {
            if (text == "") {
                return [false, "String-ul este gol."]
            }
            if (text == undefined) {
                return [false, "String-ul este undefined."]
            }
            if (text.size == 0) {
                return [false, "String-ul nu are size."]
            }
            if (regex == undefined) {
                return [true, ""]
            } else {
                if (text.match(regex))
                    return [true, ""]
                else
                    return [false, "Regex-ul nu este validat"]
            }
        }
        var err = ""
        function validate(text, camp, regex) {
            var rez_bool, rez_err
            [rez_bool, rez_err] = validateText(text, regex)
            if (!rez_bool) {
                err += `${camp}: ${rez_err}`
            }
        }
        validate(campuriText.username, "Username", "^[A-Za-z0-9]+$")
        validate(campuriText.nume, "Nume", "^([A-Z][a-z]{2,}(-[A-Z][a-z]{2,})*)$")
        validate(campuriText.prenume, "Prenume", "^([A-Z][a-z]{2,}(-[A-Z][a-z]{2,})*)$")
        if (!emailvalidator.validate(campuriText.email)) {
            err += "Eroare validare email."
        }
        if (err == "") {
            client.query("SELECT * from public.Utilizatori where id=$1", [req.session.utilizator.id], async (err2, data2) => {
                if (err2) {
                    return next(err2)
                } else {
                    if (data2.rowCount != 1) {
                        return next(new Error('Mai multi utilizatori au fost gasiti'))
                    }
                    let userSalt = data2.rows[0].salt
                    let userPassword
                    if (hashStringWithSalt(campuriText.parola, userSalt) != data2.rows[0].parola) {
                        return res.render("pagini/profil", { err: "Parola nu poate fi confirmata. Modificarile au esuat" })
                    }
                    if (campuriText.parolan.trim() != '') {
                        userSalt = generateSalt()
                        userPassword = hashStringWithSalt(campuriText.parolan, userSalt)
                        //validate(campuriText.parolan, "Parola", "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])")
                        // if(err!=""){
                        //     return res.render("pagini.profil", {err: "Parola nu este validata"})
                        // }
                    } else
                        userPassword = data2.rows[0].parola
                    let ocupatie = campuriText.ocupatie == pref_not ? undefined : campuriText.ocupatie
                    let file_path = undefined
                    let resource_path = data2.rows[0].poza_profil
                    if (campuriFile && campuriFile.poza) {//&& !campuriFile.poza.length && mime.getType(campuriFile.poza.originalFilename).includes("image")) {
                        let folderUtilzitaor = path.join(__dirname, "resurse", "poze_utilizatori", campuriText.username)
                        if (!fs.existsSync(folderUtilzitaor))
                            fs.mkdirSync(folderUtilzitaor, { recursive: true })
                        let v = campuriFile.poza.originalFilename.split(".")
                        file_path = path.join(folderUtilzitaor, `poza.${v[v.length - 1]}`)
                        try {
                            await mv_file(campuriFile.poza.filepath, file_path)
                            resource_path = file_path.replace(__dirname, "").replace(/\\/g, "/")
                        }
                        catch (err) {
                            console.log(err)
                            file_path = undefined
                        }
                    }
                    client.query("UPDATE public.utilizatori set username=$1, nume=$2, prenume=$3, \
                        parola=$4, email=$5, culoare_chat=$6, salt=$7, ocupatie=$8, poza_profil=$9 \
                        where id = $10",
                        [campuriText.username, campuriText.nume, campuriText.prenume,
                            userPassword, campuriText.email, campuriText.culoareText, userSalt, ocupatie, resource_path, req.session.utilizator.id], async (err, data) => {
                                if (err) {
                                    console.log(err)
                                    if (err.code == 23505) {
                                        res.render("pagini/profil", { err: "Adresa de email sau parola exista deja." })
                                    } else {
                                        res.render("pagini/profil", { err: "Eroare baza de date." })
                                    }
                                    if (file_path) {
                                        fs.unlink(file_path)
                                    }
                                } else {
                                    if (req.session) {
                                        req.session.utilizator = {
                                            id: data2.rows[0].id,
                                            username: campuriText.username,
                                            nume: campuriText.nume,
                                            prenume: campuriText.prenume,
                                            culoare_chat: campuriText.culoare_chat,
                                            email: campuriText.email,
                                            rol: campuriText.rol,
                                            ocupatie: ocupatie,
                                            poza_profil: resource_path
                                        }
                                    }
                                    res.render("pagini/profil", { raspuns: "Date modificate cu succes." })
                                }
                            }
                    )
                }
            })
        } else {
            res.render("pagini/profil", { err })
        }
    })
})

app.get("/api/v1/profil/stergere", protect(), (req, res, next) => {
    let code = generateSalt(25)
    client.query('update public.Utilizatori set resetare_parola=$1 where id=$2 returning email', [code, req.session.utilizator.id], async (err, data) => {
        if (err)
            return next(err)
        if (data.rowCount != 1)
            return next('A intervenit o eroare legataa de baza de date')
        let link = `${protocol}${domeniu}/sterge/${code}`
        await trimiteMail(data.rows[0].email, 'Confirmare stergere cont', `Acceseaza ${link} pentru a confirma stergerea`, `<p> Acceseaza <a href="${link}"> ${link} </a> pentru a confirma stergerea </p>`)
        return res.status(200).json({ succes: true, message: 'A fost trimis mail-ul de confirmare pe Mail' })
    })
})

app.get("/sterge/:token/", protect(), (req, res, next) => {
    client.query('delete from public.Utilizatori where resetare_parola=$1 and id=$2', [sanitizeText(req.params.token), req.session.utilizator], async (err, data) => {
        if (err)
            return next(err)
        if (data.rowCount != 1)
            return next(new Error('Verificati daca sunteti conectat si incercati din nou'))
        req.session.utilizator = undefined
        res.redirect('/index')
    }
    )
})

app.delete("/api/v1/profil/poza", protect(), (req, res, next) => {
    client.query('SELECT * from public.Utilizatori where id=$1', [req.session.utilizator.id], (err, data) => {
        if (err) {
            console.log(err)
            return next(err)
        }
        if (data.rows[0].poza_profil == '/resurse/imagini/def_profile_pic.png') {
            return next(new Error("Este deja default"))
        }
        client.query('UPDATE public.Utilizatori set poza_profil=\'/resurse/imagini/def_profile_pic.png\' where id=$1', [req.session.utilizator.id], async (err2, data2) => {
            if (err2) {
                console.log(err2)
                return next(err2)
            }
            if (data2.rowCount != 1) {
                return next(new Error('Nu a fost actualizat'))
            }
            try {
                fs.rmSync(path.join(__dirname, data.rows[0].poza_profil.split("/").join(path.sep)))
                req.session.utilizator.poza_profil = "/resurse/imagini/def_profile_pic.png"
                res.status(200).json({ success: true })
            }
            catch (err) {
                console.log(err)
                next(err)
            }
        })
    })
})

app.post("/resetareparola/", (req, res, next) => {
    var formular = new formidable.IncomingForm();
    formular.parse(req, async (err, campuriText, campuriFile) => {
        for ([key, value] of Object.entries(campuriText)) {
            campuriText[key] = sanitizeText(value)
        }
        function validateText(text, regex) {
            if (text == "") {
                return [false, "String-ul este gol."]
            }
            if (text == undefined) {
                return [false, "String-ul este undefined."]
            }
            if (text.size == 0) {
                return [false, "String-ul nu are size."]
            }
            if (regex == undefined) {
                return [true, ""]
            } else {
                if (text.match(regex))
                    return [true, ""]
                else
                    return [false, "Regex-ul nu este validat"]
            }
        }
        var err = ""
        function validate(text, camp, regex) {
            var rez_bool, rez_err
            [rez_bool, rez_err] = validateText(text, regex)
            if (!rez_bool) {
                err += `${camp}: ${rez_err}`
            }
        }
        validate(campuriText.username, "Username", "^[A-Za-z0-9]+$")
        if (err == "") {
            salt = generateSalt()
            client.query('update public.Utilizatori set parola=$1, salt=$2, resetare_parola=null where username=$3 and resetare_parola=$4', [
                hashStringWithSalt(campuriText.parola, salt), salt, campuriText.username, campuriText.token
            ], (err, data) => {
                if (err)
                    return res.render("pagini/resetareparola", { err })
                console.log(campuriText);
                console.log(data)
                if (data.rowCount != 1)
                    res.render("pagini/resetareparola", { err: "Nu au fost furnizate suficiente date" })
                else
                    res.render("pagini/resetareparola", { raspuns: "Date modificate cu succes" })
            })
        } else {
            res.render("pagini/resetareparola", { err })
        }
    })
})
app.get("/profil", protect(), (req, res) => {
    res.render("pagini/profil")
})

app.delete("/api/v1/users/:id/", restrictTo(2), (req, res, next) => {
    client.query("select * from public.Utilizatori where id=$1", [req.params.id], (err, data) => {
        if (err) {
            return next(err)
        }
        client.query("delete from public.Utilizatori where id=$1", [req.params.id], async (err2, data2) => {
            if (err) {
                next(err2)
            } else {
                if (data2 && data2.rowCount == 1) {
                    let resource_path = data.rows[0].poza_profil
                    if (resource_path != "/resurse/imagini/def_profile_pic.png") {
                        fs.rmSync(path.join(__dirname, resource_path.split("/").join(path.sep)))
                    }
                    subiect = `Stergere utilizator`
                    mesaj = `Salut ${data.rows[0].username}! Cu sinceră părere de rău, vă anunțăm că ați fost șters! Adio!`
                    html = `<h1>Salut  ${data.rows[0].username}!</h1> <p>Cu sinceră părere de rău, vă anunțăm că ați fost șters! Adio</p>`
                    await trimiteMail(data.rows[0].email, subiect, mesaj, html)
                    res.status(200).json({ success: "true" })
                } else {
                    res.status(404).json({ success: "false" })
                }
            }
        })
    })
})

app.get("/deconectare", protect(), function (req, res) {
    req.session.destroy();
    res.locals.utilizator = null;
    res.redirect('/index');
});

app.get("/users", restrictTo(2), (req, res) => {
    client.query("select id, username, nume, prenume, email from Utilizatori where rol <> 'admin'", (err, data) => {
        if (err) {
            console.log(err)
            res.status(418).render("pagini/eroare_generala", { statuscode: 418, image: "/resurse/imagini/error.png", err })
        } else {
            let fields = []
            for (x of data.fields) {
                fields.push(x.name)
            }
            res.render("pagini/users", { fields, users: data.rows })
        }
    })
})

app.post("/cumpara", protect(), function (req, res) {
    client.query("select id, nume, pret, img from public.produse where id in (" + req.body.ids_prod + ")", async (err, rez) => {
        if (err)
            return next(err)
        //console.log(err, rez);
        //console.log(rez.rows);
        for (let el of rez.rows) {
            el.cantitate = req.body.cant_prod[req.body.ids_prod.indexOf(el.id.toString())]
            await generateQRCode(el.id)
        }

        let pathFactura = path.join(__dirname, 'views', 'pagini', 'factura.ejs')

        let rezFactura = ejs.render(fs.readFileSync(pathFactura).toString("utf8"), { utilizator: req.session.utilizator, produse: rez.rows, protocol, domeniu });
        //console.log(rezFactura);
        let options = { format: 'A4', args: ['--no-sandbox'], printBackground: true };

        let file = { content: rezFactura };

        html_to_pdf.generatePdf(file, options).then(async function (pdf) {
            if (!fs.existsSync("./temp"))
                fs.mkdirSync("./temp");
            var numefis = "./temp/test" + (new Date()).getTime() + ".pdf";
            fs.writeFileSync(numefis, pdf);
            let subject = "Factură";
            let text = "Stimate " + req.session.utilizator.username + ", aveți atașată factura";
            let html = "<h1>Salut!</h1><p>Stimate " + req.session.utilizator.username + ", aveți atașată factura</p>";
            let attachments = [
                {
                    filename: 'factura.pdf',
                    content: pdf
                }
            ]
            await trimiteMail(req.session.utilizator.email, subject, text, html, attachments)
            res.write("Totu bine!"); res.end();
        });
    });
});

app.get("/*", (req, res, next) => {
    res.render(`pagini${req.url.split('?')[0]}`, (err, rezultatRender) => {
        if (err) {
            next(err)
        }
        res.send(rezultatRender);
    });
})

app.use("/*", (err, req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ success: false, message: err })
    } else {
        if (err.message.includes("Failed to lookup"))
            return res.status(404).render("pagini/eroare_generala", { statuscode: 404, image: "/resurse/imagini/404.png", err: err })
        res.status(418).render("pagini/eroare_generala", { statuscode: 418, image: "/resurse/imagini/error.png", err: err })
    }
})

fs.readdir(path.join(__dirname, "resurse", "imagini", "produse"), (err, files) => {
    for (file of files) {
        og = file
        if (file.split(".").pop() != "webp") {
            sharp(path.join(__dirname, "resurse", "imagini", "produse", file)).resize(200).toFile(path.join(__dirname, "resurse", "imagini", "produse", `${file.split(".")[0]}.webp`)).then((res, err) => {
                if (err) {
                    console.log(err)
                } else {
                    null;
                    // fs.unlink(path.join(__dirname, "resurse", "imagini", "produse", og), (err) => {
                    //     console.log(path.join(__dirname, "resurse", "imagini", "produse", file))
                    //     if (err) {
                    //         console.log(err)
                    //     }
                    // })
                }
            })
        }
    }
})

// cale = path.join("C:", "Users", "Dragos", "Desktop", "tlou2")
// //cale = path.join("C:", "Users", "Dragos", "Downloads", "Seasons", "Seasons", "Winter - Nier Automata")
// fs.readdir(cale, (err, files) => {
//     for (file of files) {
//         // sharp(path.join(cale, file)).resize(400).toFile(path.join("C:", "Users", "Dragos", "Desktop", "tlou2", `${ file.split(".")[0] }.webp`)).then((res, err) => {
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