import express from "express";
import path from "path";
import fsExtra from "fs-extra";

const app = express();
const PORT = 3000;

app.use(express.json());

async function dohvatiZaposlenike() {
  try {
    const zaposlenici = await fsExtra.readJSON(
      path.join(path.resolve(), "data", "zaposlenici.json")
    );

    return zaposlenici;
  } catch (error) {
    console.error("Greška kod dohvaćanja datoteke: ", error);
    return null;
  }
}

async function pohraniZaposlenike(zaposlenici) {
  try {
    await fsExtra.writeJSON(
      path.join(path.resolve(), "data", "zaposlenici.json"),
      zaposlenici
    );

    return true;
  } catch (error) {
    console.error("Greška kod pohrane podataka u datoteku: ", error);
    return false;
  }
}

function provjeraPodataka(zaposlenik) {
  const zadovoljavajuciKljucevi = [
    "id",
    "ime",
    "prezime",
    "godine_staza",
    "pozicija",
  ];
  const kljucevi = Object.keys(zaposlenik);

  const containsKeys = zadovoljavajuciKljucevi.every((kljuc) =>
    kljucevi.includes(kljuc)
  );

  if (!containsKeys) {
    return "Nisu pohranjeni svi podaci!";
  }

  const containsValidIdAndGodineStaza =
    !isNaN(zaposlenik.id) && !isNaN(zaposlenik.godine_staza);

  if (!containsValidIdAndGodineStaza) {
    return "ID i godine_staza moraju biti brojevi!";
  }

  const validString =
    typeof zaposlenik.ime == "string" &&
    typeof zaposlenik.prezime == "string" &&
    typeof zaposlenik.pozicija == "string";

  if (!validString) {
    return "Ime, prezime i pozicija moraju biti string!";
  }

  return "";
}

app.get("/zaposlenici", async (req, res) => {
  try {
    const sortiraj_po_godinama_query = req.query.sortiraj_po_godinama;
    const pozicija_query = req.query.pozicija;
    const godine_staža_min_query = Number(req.query.godine_staža_min);
    const godine_staža_max_query = Number(req.query.godine_staža_max);

    let zaposlenici = await dohvatiZaposlenike();
    let poruka = "";

    let provjera = zaposlenici.every((zaposlenik) => {
      poruka = provjeraPodataka(zaposlenik);
      return poruka == "";
    });

    console.log(provjera);

    if (provjera) {
      //SORT
      if (sortiraj_po_godinama_query) {
        if (sortiraj_po_godinama_query == "uzlazno") {
          zaposlenici.sort(
            (zap1, zap2) => zap1.godine_staza - zap2.godine_staza
          );
        } else if (sortiraj_po_godinama_query == "silazno") {
          zaposlenici.sort(
            (zap1, zap2) => zap2.godine_staza - zap1.godine_staza
          );
        }
      }

      //FILTER
      let filtriraniZaposlenici = [...zaposlenici];
      if (godine_staža_min_query > godine_staža_max_query) {
        return res
          .status(400)
          .send(
            "Min_godine_staza mora biti manji ili jednak max_godine_staza!"
          );
      }

      if (pozicija_query) {
        filtriraniZaposlenici = filtriraniZaposlenici.filter((zaposlenik) => {
          return zaposlenik.pozicija == pozicija_query;
        });
      }

      if (!isNaN(godine_staža_min_query)) {
        filtriraniZaposlenici = filtriraniZaposlenici.filter((zaposlenik) => {
          return zaposlenik.godine_staza >= godine_staža_min_query;
        });
      }

      if (!isNaN(godine_staža_max_query)) {
        filtriraniZaposlenici = filtriraniZaposlenici.filter((zaposlenik) => {
          return zaposlenik.godine_staza <= godine_staža_max_query;
        });
      }

      res.status(200).json(filtriraniZaposlenici);
    } else {
      res.status(400).send(poruka);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Greška kod dohvaćanja zaposlenika!");
  }
});

app.get("/zaposlenici/:id", async (req, res) => {
  try {
    let zaposlenici = await dohvatiZaposlenike();
    let poruka = "";

    let provjera = zaposlenici.every((zaposlenik) => {
      poruka = provjeraPodataka(zaposlenik);
      return poruka == "";
    });

    console.log(provjera);
    if (provjera) {
      const id = Number(req.params.id);

      const index = zaposlenici.findIndex((zaposlenik) => {
        return zaposlenik.id === id;
      });

      if (index != -1) {
        res.status(200).json(zaposlenici[index]);
      } else {
        res.status(404).send("Zaposlenik sa traženim ID-em ne postoji!");
      }
    } else {
      res.status(400).send(poruka);
    }
  } catch (error) {
    res.status(500).send("Greška kod dohvaćanja zaposlenika!");
  }
});

app.post("/zaposlenici", async (req, res) => {
  let zaposlenik = req.body;

  let zaposlenici = await dohvatiZaposlenike();
  let poruka = "";

  let provjera = zaposlenici.every((zaposlenik) => {
    poruka = provjeraPodataka(zaposlenik);
    return poruka == "";
  });

  console.log(provjera);

  if (provjera) {
    let id = zaposlenici.length != 0 ? zaposlenici.length + 1 : 1;
    zaposlenik = { id: id, ...zaposlenik };
    const poruka = provjeraPodataka(zaposlenik);

    if (poruka == "") {
      zaposlenici.push(zaposlenik);

      if (pohraniZaposlenike(zaposlenici)) {
        res.status(201).send("Zaposlenik uspješno pohranjen!");
      } else {
        res.status(500).send("Greška kod pohrane podataka u datoteku!");
      }
    } else {
      res.status(400).send(poruka);
    }
  } else {
    res.status(400).send(poruka);
  }
});

app.listen(PORT, (error) => {
  if (error) {
    console.error("Greška na poslužitelju:", error);
  } else {
    console.log("Server sluša na portu: ", PORT);
  }
});
