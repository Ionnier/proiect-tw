const express = require('express');
app = express();


app.use("/resurse", express.static(__dirname + "/resurse"))
app.set("view engine", "ejs")


app.get("/", (req, res) => {
    console.log(req.url)
    res.render("pagini/index")
})
app.get("/*", (req, res) => {
    console.log(req.url)
    res.render(`pagini/${req.url}`, (err, rezultatRender) => {
        console.log(err)
        if (err) {
            res.render(`pagini/404`)
        } else {
            res.send(rezultatRender)
        }
    })
})

console.log("Server-ul a pornit")
app.listen(8080)