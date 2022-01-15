window.addEventListener("load",function(){
    // 	var myHeaders = new Headers();
    // myHeaders.append();

    function setLocalStorage(productId, productQuantity){
        let ids_produse = localStorage.getItem("produse_selectate")
        if (ids_produse)
            ids_produse = ids_produse.split(",");
        else
            ids_produse = []
        //console.log("Selectie veche:", ids_produse);
        //ids_produse.map(function(elem){return parseInt(elem)});
        //console.log(ids_produse);
        let indx = undefined;
        for (let i = 0; i < ids_produse.length; i++) {
            if (parseInt(ids_produse[i].split(":")[0]) == parseInt(productId)) {
                indx = i;
                break;
            }
        }
        if (indx && parseInt(productQuantity) == 0) {
            ids_produse.splice(indx, 1)
        } else {
            if (indx!=undefined) {
                ids_produse.splice(indx, 1);
            }
            ids_produse.push(`${productId}:${productQuantity}`)
        }
        console.log("Selectie noua:")
        console.log(ids_produse);
        localStorage.setItem("produse_selectate", ids_produse.join(","))
    }

    function setPage() {
        if (localStorage.getItem("produse_selectate")) {
            for (x of localStorage.getItem("produse_selectate").split(",")) {
                let productId = parseInt(x.split(':')[0])
                let productQuantity = parseInt(x.split(':')[1])
                input = document.getElementById(`cantitate${productId}`)
                // if(parseInt(input.max) < parseInt(x.split(':')[1]){
                //     setLocalStorage()
                // }
                input.parentElement.style.backgroundColor='var(--color_alternative)'
                if(input.max<productQuantity){
                    setLocalStorage(productId, input.max)
                    productQuantity = input.max
                }
                input.value = `${parseInt(productQuantity)}`//Math.max(parseInt(input.max), parseInt(productQuantity))
                //console.log(input)
            }
        }
    }
    
    function getInputValue(id) {
        let input = document.getElementById(id)
        let productId = id.replace('cantitate', '')
        if (input.value == 0)
            input.parentElement.style.backgroundColor = 'transparent'
            console.log(productId, parseInt(input.value))
        setLocalStorage(parseInt(productId),  parseInt(input.value))
        setPage()
    }

        var prod_sel=localStorage.getItem("produse_selectate")

        if (prod_sel){ //p.then(f1).then(f2).then(f3)
            var vect_prods=prod_sel.split(",");
            var vect_ids = []
            var vect_cants = []
            for (x of vect_prods){
                vect_ids.push(x.split(':')[0])
                vect_cants.push(x.split(':')[1])
            }
            fetch("/produse_cos", {		
                method: "POST",
                headers:{'Content-Type': 'application/json'},
                mode: 'cors',		
                cache: 'default',
                body: JSON.stringify({
                    ids_prod: vect_ids,
                    cant_prod: vect_cants
                })
            })
            .then(function(rasp){ console.log(rasp); x=rasp.json(); console.log(x); return x})
            .then(function(objson) {
                console.log(objson);
                for (let prod of objson){
                    let divCos=document.createElement("div");
                    divCos.classList.add("cos-virtual")
                    let divImagine=document.createElement("div");
                    let imag=document.createElement("img");
                    imag.src=prod.img;
                    divImagine.appendChild(imag);
                    divCos.appendChild(divImagine);
                    let divInfo=document.createElement("div");
                    divInfo.innerHTML=`<p><b>${prod.nume}</b></p><p>Pret: ${prod.pret}</p>`;
                    divCos.appendChild(divInfo);
                    document.getElementsByTagName("main")[0].insertBefore(divCos, document.getElementById("cumpara"));
                    let label=document.createElement("label");
                    label.classList.add('selecteaza-cos')
                    label.innerHTML='Selecteaza: <br/>'
                    console.log(label)
                    let input = document.createElement("input");
                    console.log(input)
                    input.style.display='block';
                    input.type='number';
                    input.classList.add('selecteaza-cos');
                    input.id=`cantitate${prod.id}`;
                    input.onKeyDown=()=>{return false}
                    input.min=0;
                    input.max=(prod.stoc)?prod.stoc:10;
                    input.value=0;
                    input.onclick=function(){getInputValue(input.id)}
                    input.autocomplete='off'
                    label.appendChild(input)
                    divCos.append(label)
                }
                setPage()
            }
            ).catch(function(err){console.log(err)});
            document.getElementById("cumpara").onclick=function(){
                var vect_ids=localStorage.getItem("produse_selectate").split(",");
                var vect_ids = []
                var vect_cants = []
                for (x of vect_prods){
                    vect_ids.push(x.split(':')[0])
                    vect_cants.push(x.split(':')[1])
                }
                fetch("/cumpara", {		
                    method: "POST",
                    headers:{'Content-Type': 'application/json'},
                    mode: 'cors',		
                    cache: 'default',
                    body: JSON.stringify({
                        ids_prod: vect_ids,
                        cant_prod: vect_cants
                    })
                })
                .then(function(rasp){ console.log(rasp); return rasp.text()})
                .then(function(raspunsText) {
                    console.log(raspunsText);
                    let p=document.createElement("p");
                    p.innerHTML=raspunsText;
                    document.getElementsByTagName("main")[0].innerHTML="";
                    document.getElementsByTagName("main")[0].appendChild(p)
                    if(!raspunsText.includes("nu sunteti logat"))
                        localStorage.removeItem("produse_selectate");
               
                }
                ).catch(function(err){console.log(err)});
            }

        }
        else{
            document.getElementsByTagName("main")[0].innerHTML="<p>Nu aveti nimic in cos!</p>";
        }
        
        
    });

    