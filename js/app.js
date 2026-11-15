const CLE = "mds_panier";
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const fcfa = n => Number(n).toLocaleString("fr-FR") + " FCFA";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const mlTxt = p => p.ml ? `${p.ml} ml` : "Taille à préciser";
const lien = t => "https://wa.me/" + BOUTIQUE.whatsapp + (t ? "?text=" + encodeURIComponent(t) : "");

function panier() { try { return JSON.parse(localStorage.getItem(CLE)) || []; } catch { return []; } }
function sauverPanier(p) { localStorage.setItem(CLE, JSON.stringify(p)); badge(); }
function badge() {
  const n = panier().reduce((s, l) => s + l.qte, 0);
  $$(".badge").forEach(b => { b.textContent = n; b.hidden = !n; });
}
function toast(m) {
  const t = $("#toast"); if (!t) return;
  t.textContent = m; t.classList.add("montre");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("montre"), 2000);
}

// Transition : rideau puis changement de page
document.addEventListener("click", e => {
  const a = e.target.closest("a[data-lien]"); if (!a) return;
  e.preventDefault();
  document.body.classList.add("quitte");
  setTimeout(() => location.href = a.href, 430);
});

function remplirBoutique() {
  $$("[data-bind]").forEach(el => {
    const v = BOUTIQUE[el.dataset.bind];
    el.textContent = Array.isArray(v) ? v.join(" · ") : (v ?? "");
  });
  $$("[data-wa]").forEach(a => a.href = lien());
  const tels = $("#telList");
  if (tels) tels.innerHTML = BOUTIQUE.telephones.map(t =>
    `<p><a href="tel:${t.replace(/\s/g, "")}">${esc(t)}</a></p>`).join("");
}

function carteHTML(p) {
  const visuel = p.image
    ? `<div class="visuel${p.dispo ? "" : " epuise"}"><img src="${esc(p.image)}" alt="${esc(p.nom)}"></div>`
    : `<div class="visuel${p.dispo ? "" : " epuise"}">🧴</div>`;
  const action = p.dispo
    ? `<button class="bouton" data-ajout="${p.id}">Commander</button>`
    : `<span class="etiquette-off">Indisponible</span>`;
  return `<article class="carte">${visuel}<div class="corps">
    <h3>${esc(p.nom)}</h3>
    <span class="taille">${mlTxt(p)}</span>
    <span class="prix">${fcfa(p.prix)}</span>
    ${action}
  </div></article>`;
}

function liaisonAjout(zone) {
  if (!zone) return;
  zone.addEventListener("click", e => {
    const b = e.target.closest("[data-ajout]"); if (!b) return;
    const id = +b.dataset.ajout, p = PRODUITS.find(x => x.id === id);
    const liste = panier(), l = liste.find(x => x.id === id);
    l ? l.qte++ : liste.push({ id, qte: 1 });
    sauverPanier(liste); toast(`${p.nom} ajouté au panier`);
  });
}

function pageAccueil() {
  const z = $("#vedettes");
  if (z) { z.innerHTML = PRODUITS.filter(p => p.dispo).slice(0, 3).map(carteHTML).join(""); liaisonAjout(z); }
}

function pageCatalogue() {
  const g = $("#grille"), f = $("#filtres");
  const cats = [...new Set(PRODUITS.map(p => p.categorie))];
  f.innerHTML = cats.map((c, i) => `<button class="${i ? "" : "actif"}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  const afficher = cat => {
    const liste = PRODUITS.filter(p => p.categorie === cat);
    g.innerHTML = liste.length ? liste.map(carteHTML).join("") : `<p class="vide">Aucun produit pour le moment.</p>`;
  };
  afficher(cats[0]);
  f.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    $$("button", f).forEach(x => x.classList.remove("actif"));
    b.classList.add("actif"); afficher(b.dataset.cat);
  });
  liaisonAjout(g);
}

function pagePanier() {
  const z = $("#lignes"), t = $("#total"), suite = $("#suite");
  const rendu = () => {
    const liste = panier();
    if (!liste.length) {
      z.innerHTML = `<p class="vide">Votre panier est vide.</p><div style="text-align:center"><a class="bouton" data-lien href="catalogue.html">Voir le catalogue</a></div>`;
      t.textContent = ""; suite.hidden = true; return;
    }
    suite.hidden = false;
    let somme = 0;
    z.innerHTML = liste.map(l => {
      const p = PRODUITS.find(x => x.id === l.id);
      if (!p) return "";
      somme += p.prix * l.qte;
      return `<div class="ligne"><div class="nom">${esc(p.nom)}<small>${fcfa(p.prix)} · ${mlTxt(p)}</small></div>
        <div class="qte"><button data-moins="${p.id}">−</button><span>${l.qte}</span><button data-plus="${p.id}">+</button></div>
        <strong>${fcfa(p.prix * l.qte)}</strong><button class="supp" data-supp="${p.id}" title="Retirer">✕</button></div>`;
    }).join("");
    t.textContent = "Total : " + fcfa(somme);
  };
  z.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    let liste = panier();
    const id = +(b.dataset.plus || b.dataset.moins || b.dataset.supp);
    const l = liste.find(x => x.id === id); if (!l) return;
    if (b.dataset.plus) l.qte++;
    if (b.dataset.moins) l.qte = Math.max(1, l.qte - 1);
    if (b.dataset.supp) liste = liste.filter(x => x.id !== id);
    sauverPanier(liste); rendu();
  });
  rendu();
}

function pageCommande() {
  const liste = panier(), form = $("#formCommande"), resume = $("#resume");
  const lignes = liste.map(l => ({ p: PRODUITS.find(x => x.id === l.id), qte: l.qte })).filter(x => x.p);
  if (!lignes.length) {
    form.hidden = true;
    resume.innerHTML = `<p class="vide">Votre panier est vide.</p><div style="text-align:center"><a class="bouton" data-lien href="catalogue.html">Aller au catalogue</a></div>`;
    return;
  }
  const somme = lignes.reduce((s, x) => s + x.p.prix * x.qte, 0);
  resume.innerHTML = lignes.map(({ p, qte }) =>
    `<div class="ligne"><div class="nom">${esc(p.nom)}<small>× ${qte}</small></div><strong>${fcfa(p.prix * qte)}</strong></div>`).join("")
    + `<div class="total"><span>Total</span><span>${fcfa(somme)}</span></div>`;

  form.addEventListener("submit", e => {
    e.preventDefault();
    const prenom = $("#prenom").value.trim(), nom = $("#nom").value.trim();
    const tel = $("#telephone").value.trim(), lieu = $("#lieu").value.trim();
    if (!prenom || !nom || !tel || !lieu) { toast("Merci de remplir tous les champs"); return; }
    const detail = lignes.map(({ p, qte }) => `- ${p.nom} (${mlTxt(p)}) x${qte} = ${fcfa(p.prix * qte)}`).join("\n");
    const message = `Bonjour ${BOUTIQUE.nom}, je souhaite passer commande :\n${detail}\n\nTotal : ${fcfa(somme)}\n` +
      `Nom : ${prenom} ${nom}\nTéléphone : ${tel}\nLieu de livraison : ${lieu}\n\nMerci de me confirmer les frais de livraison.`;
    $("#validation").classList.add("montre");
    $("#ouvrirWa").href = lien(message);
    setTimeout(() => {
      window.open(lien(message), "_blank");
      sauverPanier([]);
    }, 2300);
  });
}

function boutonTheme() {
  const nav = $("header nav"); if (!nav || $(".theme-btn", nav)) return;
  const b = document.createElement("button");
  b.className = "theme-btn"; b.type = "button"; b.title = "Changer de thème";
  const rendu = () => { b.textContent = document.documentElement.dataset.theme === "dark" ? "☀️" : "🌙"; };
  b.addEventListener("click", () => {
    const sombre = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = sombre ? "dark" : "light";
    localStorage.setItem("mds_theme", sombre ? "dark" : "light");
    rendu();
  });
  rendu(); nav.appendChild(b);
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  $$("nav a").forEach(a => { if (a.dataset.page === page) a.classList.add("actif"); });
  remplirBoutique(); badge(); boutonTheme();
  if (page === "accueil") pageAccueil();
  if (page === "catalogue") pageCatalogue();
  if (page === "panier") pagePanier();
  if (page === "commande") pageCommande();
});
