import random
import os
from faker import Faker

fake = Faker()


photos = []



categorii_produs = ['Jocuri', 'Console', 'Accesorii', 'Carduri Valorice']
tip_produs = ['Special', 'Limitat', 'Minunat', 'Recomandat']
platforme = ['PlayStation 4', 'PlayStation 5', 'PlayStation 3', 'PlayStation 2', 'PlayStation',
             'Xbox', 'Xbox One', 'Xbox One Series S|X', 'PC', 'Nintendo Switch', 'Nintendo 3DS', 'Nintendo Wii']
public_tinta = ['Adulti', 'Copii', 'Tineri', 'Toti', 'Tineri+', 'Copii+']


def rand_string(length=10):
    random_string = ''
    for _ in range(length):
        random_integer = random.randint(97, 97 + 26 - 1)
        random_string += (chr(random_integer))
    return random_string


def rand_int(max=10, min=5):
    return random.randint(min, max)


def get_arr_platf():
    string = '['
    nr_platf = rand_int(3, 1)
    for _ in range(nr_platf):
        string += f"'{platforme[rand_int(len(platforme)-1,0)]}',"
    string = string[:-1]+"]"
    return string


def random_code():
    stra = rand_string(4).upper()
    asd = list(stra)
    asd[rand_int(3, 0)] = '?'
    return str(rand_int(3, 1))+": "+"".join(asd)


axox = " <br> "

done = False
print(done)
img_path = os.path.join(os.getcwd(), "..","resurse", "imagini", "produse")
for file in os.listdir(img_path):
    photos.append(f"/resurse/imagini/produse/{file}")
def generate_insert_produs():
    return f"('{rand_string(rand_int(10))}', '{rand_string(rand_int(20,5))}', '{photos[rand_int(len(photos)-1,0)]}'," +\
        f"'{categorii_produs[rand_int(len(categorii_produs)-1,0)]}', '{tip_produs[rand_int(len(tip_produs)-1,0)]}'," +\
        f"{rand_int(10000,100)}, {rand_int(800,25)}, '{fake.date()}', array {get_arr_platf()}, {rand_int(1000,5)%3==0}, '{public_tinta[rand_int(len(public_tinta),1)-1]}', {rand_int(50,4)})"


def generate_insert(n):
    str = f"INSERT INTO public.produse (nume, descriere, img, categorie, tip_produs, pret, greutate, data_lansare, compatibilitate, doar_online, public_tinta, stoc) VALUES "
    for _ in range(n):
        str += generate_insert_produs()
        str += ","
    str = str[:-1] + ";"
    return str


def generate_insert_forum_postare():
    return f"('{rand_string(rand_int(20,5))}', '{rand_string(rand_int(500, 300))+axox+random_code()}', '{fake.date()}')"


def generate_insert_forum(n):
    str = f"INSERT INTO public.postari (titlu, continut, data_publicare) VALUES "
    for _ in range(n):
        str += generate_insert_forum_postare()
        str += ","
    str = str[:-1] + ";"
    return str


# print(random_code())
print(generate_insert(100))
#print(generate_insert_forum(100))

def get_ocupations(x):
    import csv
    with open("LISTA COR.csv", "r", encoding='utf-8') as f:
        all_lines = csv.reader(f, delimiter=',', quotechar='"')
        linii = []
        for _ in all_lines:
            linii.append(_)
        idx_ocupatii = set()
        while len(idx_ocupatii) != int(x):
            idx_ocupatii.add(rand_int(len(linii)-1, 0))
        ocupatii = [linii[x][-1].capitalize() for x in idx_ocupatii]
        rez = []
        for x in ocupatii:
            rez.append(x)
        return rez
            
#print(get_ocupations(10))


def register():
    import keyboard
    import random
    import time
    time.sleep(2)
    def rand_string(length=10):
        random_string = ''
        for _ in range(length):
            random_integer = random.randint(97, 97 + 26 - 1)
            random_string += (chr(random_integer))
        return random_string
    og = rand_string(5)
    keyboard.write(f"{og}")
    time.sleep(1)
    keyboard.write(f"{og.capitalize()}")
    time.sleep(1)
    keyboard.write(f"{og.capitalize()}")
    time.sleep(1)
    keyboard.write(f"{og}")
    time.sleep(1)
    keyboard.write(f"{og}")
    time.sleep(1)
    keyboard.write(f"{og}@cti.ro")
    time.sleep(1)


            
