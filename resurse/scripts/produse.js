var mediu
var usor
function reset_range() {
    var el = document.getElementById("inp-pret")
    var articole = document.getElementsByClassName("produs");
    var pret_minim = parseInt(articole[0].getElementsByClassName("val-pret")[0].innerHTML)
    var pret_maxim = parseInt(articole[0].getElementsByClassName("val-pret")[0].innerHTML)
    var greutate_total = parseInt(articole[0].getElementsByClassName("val-greutate")[0].innerHTML)
    for (let i = 1; i < articole.length; i++) {
        let curr_pret = parseFloat(articole[i].getElementsByClassName("val-pret")[0].innerHTML)
        greutate_total += parseInt(articole[i].getElementsByClassName("val-greutate")[0].innerHTML)
        if (curr_pret < pret_minim) {
            pret_minim = curr_pret
            continue;
        }
        if (curr_pret > pret_maxim) {
            pret_maxim = curr_pret
        }
    }
    el.min = parseInt(pret_minim)
    el.max = parseInt(pret_maxim)
    var info = document.getElementById("minRange");//returneaza null daca nu gaseste elementul
    if (!info) {
        info = document.createElement("span");
        info.id = "minRange"
        info.innerHTML = "(" + pret_minim + ")";
        el.insertAdjacentElement("beforebegin", info)
    }
    var info = document.getElementById("maxRange");//returneaza null daca nu gaseste elementul
    if (!info) {
        info = document.createElement("span");
        info.id = "maxRange"
        info.innerHTML = "(" + pret_maxim + ")";
        el.insertAdjacentElement("afterend", info)
    }
    var platforme = document.getElementsByClassName("platforma")
    var platforme_uniques = new Set()
    for (let platforma of platforme) {
        platforme_uniques.add(platforma.innerHTML);
    }
    var lista = document.getElementById("i_sel_multiplu");
    for (let platforma of platforme_uniques) {
        var spanSuma;
        // <option value="zahar">zahar</option>
        spanSuma = document.createElement("option");
        spanSuma.innerHTML = platforma;
        spanSuma.value = platforma;//<span id="..."
        lista.appendChild(spanSuma);
    }
    mediu = Math.round(greutate_total / articole.length)
    usor = Math.round(mediu / 2)
    document.getElementById("i_sel_multiplu")
    for (let el of document.getElementsByClassName("greutate-usor"))
        el.innerHTML = usor
    for (let el of document.getElementsByClassName("greutate-mediu"))
        el.innerHTML = mediu

}

window.onload = function () {
    var btn = document.getElementById("filtrare");
    btn.onclick = function () {
        var optiuni = document.getElementById("i_sel_multiplu").options;
        var lista_op = [];
        for (let opt of optiuni) {
            if (opt.selected)
                lista_op.push(opt.value)
        }
        var getTags = document.getElementById("tags").value.trim();
        while (getTags != getTags.replace("  ", "")) {
            getTags = getTags.replace("  ", "")
        }
        if (getTags[getTags.length - 1] == " ") {
            getTags = getTags.slice(0, -1)
        }
        var tags = getTags.split(" ")
        var articole = document.getElementsByClassName("produs");
        for (let art of articole) {

            art.style.display = "none";

            /*
            v=art.getElementsByClassName("nume")
            nume=v[0]*/
            var nume = art.getElementsByClassName("nume")[0];//<span class="val-nume">aa</span>
            var conditie1 = nume.innerHTML.toLowerCase().includes(document.getElementById("inp-nume").value.toLowerCase())

            var pret = art.getElementsByClassName("val-pret")[0]
            var conditie2 = parseInt(pret.innerHTML) >= parseInt(document.getElementById("inp-pret").value);

            var radbtns = document.getElementsByName("gr_rad");
            for (let rad of radbtns) {
                if (rad.checked) {
                    var valCalorii = rad.value;//poate fi 1, 2 sau 3
                    break;
                }
            }

            var caloriiArt = parseInt(art.getElementsByClassName("val-greutate")[0].innerHTML);
            var conditie3 = false;
            switch (valCalorii) {
                case "1": conditie3 = (caloriiArt < usor); break;
                case "2": conditie3 = (caloriiArt >= usor && caloriiArt < mediu); break;
                //case "3": conditie3= (caloriiArt>=700); break;
                default: conditie3 = true;
            }
            var selCateg = document.getElementById("inp-categorie");

            var conditie4 = (art.getElementsByClassName("val-categorie")[0].innerHTML.trim() == selCateg.value.trim() || selCateg.value == "toate");

            var conditie5 = !(tags.length == 0)
            var results = []
            for (let tag of tags) {
                if (tag == "") {
                    continue;
                }
                let descr = art.getElementsByClassName("descriere")[0].innerHTML;
                if ((tag[0] != "+" || tag[0] != "-")) {
                    var eroare_tags;
                    eroare_tags = document.getElementById("eroare_tags");
                    if (!eroare_tags) {
                        eroare_tags = document.createElement("eroare_tags");
                        eroare_tags.innerHTML = "<br>Eroare de formatare";//<span> Suma:...
                        eroare_tags.id = "eroare_tags";//<span id="..."
                        document.getElementById("tags").insertAdjacentElement("afterend", eroare_tags);
                        setTimeout(function () { document.getElementById("eroare_tags").remove() }, 2000);
                    }
                    results = []
                    break;
                }
                if ((tag[0] == "+") == descr.includes(tag.slice(1))) {
                    results.push(true)
                } else {
                    results.push(false)
                }
            }
            for (let result of results) {
                conditie5 = conditie5 && result
            }
            var conditie6 = true;
            results = []
            if (lista_op.length > 0) {
                var comp_list = art.getElementsByClassName("platforma")
                for (let el of comp_list)
                    results.push(lista_op.includes(el.innerHTML))
                conditie6 = results.includes(true)
            }

            var conditie7 = true;
            var locatie = art.getElementsByClassName("locatie")[0].innerHTML.toLowerCase()
            var checkboxes = document.getElementsByClassName("chckbox")
            results = []
            for (let checkbox of checkboxes) {
                if (checkbox.checked == true) {
                    if (locatie.includes(checkbox.name)) {
                        results.push(true)
                    }
                }
            }
            conditie7 = results.includes(true)
            if (conditie1 && conditie2 && conditie3 && conditie4 && conditie5 && conditie6 && conditie7)
                art.style.display = "block";

        }
    }
    var rng = document.getElementById("inp-pret");
    rng.onchange = function () {
        var info = document.getElementById("infoRange");//returneaza null daca nu gaseste elementul
        if (!info) {
            info = document.createElement("span");
            info.id = "infoRange"
            this.parentNode.appendChild(info);
        }

        info.innerHTML = "(" + this.value + ")";
    }



    function sorteaza(semn) {
        var articole = document.getElementsByClassName("produs");
        var v_articole = Array.from(articole);
        v_articole.sort(function (a, b) {
            var nume_a = a.getElementsByClassName("nume")[0].innerHTML;
            var nume_b = b.getElementsByClassName("nume")[0].innerHTML;
            if (nume_a != nume_b) {
                return semn * nume_a.localeCompare(nume_b);
            }
            else {
                var pret_a = parseInt(a.getElementsByClassName("val-pret")[0].innerHTML);
                var pret_b = parseInt(b.getElementsByClassName("val-pret")[0].innerHTML);
                return semn * (pret_a - pret_b);
            }
        });
        for (let art of v_articole) {
            art.parentNode.appendChild(art);
        }
    }

    var btn2 = document.getElementById("sortCrescNume");
    btn2.onclick = function () {

        sorteaza(1)
    }

    var btn3 = document.getElementById("sortDescrescNume");
    btn3.onclick = function () {
        sorteaza(-1)
    }


    document.getElementById("resetare").onclick = function () {
        //resetare inputuri
        document.getElementById("i_rad4").checked = true;
        document.getElementById("inp-pret").value = document.getElementById("inp-pret").min;
        document.getElementById("infoRange").innerHTML = "(" + document.getElementById("inp-pret").min + ")";
        document.getElementsByTagName("textarea")[0].value = ""
        document.getElementById("sel-toate").selected = true;
        for (let elem of document.getElementsByClassName("chckbox")) {
            elem.checked = true
        }
        for (let el of document.getElementById("i_sel_multiplu").getElementsByTagName("option"))
            el.selected = false

        //de completat...


        //resetare articole
        var articole = document.getElementsByClassName("produs");
        for (let art of articole) {

            art.style.display = "block";
        }
    }
    reset_range()
}
window.onkeydown = function (e) {
    if (e.key == "c" && e.altKey == true) {
        var suma = 0;
        var articole = document.getElementsByClassName("produs");
        for (let art of articole) {
            if (art.style.display != "none")
                suma += parseFloat(art.getElementsByClassName("val-pret")[0].innerHTML);
        }

        var spanSuma;
        spanSuma = document.getElementById("numar-suma");
        if (!spanSuma) {
            spanSuma = document.createElement("span");
            spanSuma.innerHTML = "Suma preturilor:" + suma;//<span> Suma:...
            spanSuma.id = "numar-suma";//<span id="..."
            document.getElementById("p-suma").appendChild(spanSuma);
            setTimeout(function () { document.getElementById("numar-suma").remove() }, 2000);
        }
    }

}

