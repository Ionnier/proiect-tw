
window.addEventListener("DOMContentLoaded", function () {
    var tema = localStorage.getItem("tema");
    btn = document.getElementById("schimba_tema");
    if (!tema) {//nu am setat inca o tema
        localStorage.setItem("tema", "light");
    }
    else {
        if (tema == "dark") {
            btn.classList.toggle('fa-moon')
            btn.classList.remove('fa-sun')
            btn.classList.remove('fa-circle')
            document.body.classList.add("dark");
        }
        else if (tema == "luck") {
            btn.classList.remove('fa-sun')
            btn.classList.remove('fa-moon')
            btn.classList.toggle('fa-circle')
            document.body.classList.add("luck");
        }
    }
    if (btn) {
        btn.onclick = function () {
            if (document.body.classList.contains("dark")) {
                document.body.classList.toggle("dark");
                document.body.classList.toggle("luck")
                btn.classList.toggle('fa-moon')
                btn.classList.toggle('fa-circle')
                localStorage.setItem("tema", "luck");
            } else if (document.body.classList.contains("luck")) {
                document.body.classList.toggle("luck")
                localStorage.setItem("tema", "light");
                btn.classList.toggle('fa-circle')
                btn.classList.toggle('fa-sun')
            } else {
                document.body.classList.toggle("dark");
                btn.classList.toggle('fa-sun')
                btn.classList.toggle('fa-moon')
                localStorage.setItem("tema", "dark");
            }
        }
    }
});

