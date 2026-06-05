const tva = 0.2;
const limiteCommandes = 5;

let plats = [];
let panier = JSON.parse(localStorage.getItem("cart")) || [];
let commandes = JSON.parse(localStorage.getItem("orders")) || [];

const menuDiv = document.getElementById("menu");
const panierDiv = document.getElementById("cart-items");
const totalSpan = document.getElementById("cart-total");
const btnCommander = document.getElementById("btn-order");
const commandesDiv = document.getElementById("orders");
const recapDiv = document.getElementById("order-summary");
const modal = document.getElementById("orderModal");
const notif = document.getElementById("notification");

// quelques helpers pour la lisibilité imo 

const libellesStatut = {
  preparation: "Préparation",
  livraison: "en livraison",
  livre: "Livré ;)",
};

function sauvegarderPanier() {
  localStorage.setItem("cart", JSON.stringify(panier));
}

function sauvegarderCommandes() {
  localStorage.setItem("orders", JSON.stringify(commandes));
}

function pause(duree) {
  return new Promise(function (ok) {
    setTimeout(ok, duree);
  });
}

function showToast(msg, erreur) {
  notif.textContent = msg;
  notif.className = "fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white " + (erreur ? "bg-red-500" : "bg-green-500");
  notif.classList.remove("hidden");
  setTimeout(function () { notif.classList.add("hidden"); }, 7000);
}

function openModal() {
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

function getTotal() {
  let somme = 0;
  panier.forEach(function (ligne) {
    somme = somme + ligne.price * ligne.quantity;
  });
  return somme;
}

function compterCommandesEnCours() {
  let nb = 0;
  commandes.forEach(function (cmd) {
    if (cmd.status !== "livre" && cmd.status !== "annulee") nb++;
  });
  return nb;
}

async function loadMenu() {
  const res = await fetch("./menu.json");
  plats = await res.json();
  renderMenu();
}

function renderMenu() {
  menuDiv.innerHTML = "";

  plats.forEach(function (plat) {
    const carte = document.createElement("div");
    carte.className = "bg-white rounded-lg shadow overflow-hidden flex flex-col";
    carte.innerHTML = `
      <img src="${plat.image}" class="w-full h-44 object-cover" alt="${plat.name}">
      <div class="p-4 flex flex-col flex-1">
        <h3 class="font-semibold text-lg">${plat.name}</h3>
        <p class="text-gray-500 text-sm mt-1">${plat.description}</p>
        <p class="font-bold mt-2">${plat.price.toFixed(2)} €</p>
        <button class="mt-auto bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Ajouter</button>
      </div>
    `;
    carte.querySelector("button").onclick = function () {
      addToCart(plat.id);
    };
    menuDiv.appendChild(carte);
  });
}

function addToCart(id) {
  let trouve = false;

  for (let i = 0; i < panier.length; i++) {
    if (panier[i].id === id) {
      panier[i].quantity++;
      trouve = true;
      break;
    }
  }

  if (!trouve) {
    const p = plats.find(function (x) { return x.id === id; });
    panier.push({ id: p.id, name: p.name, price: p.price, quantity: 1 });
  }

  sauvegarderPanier();
  renderCart();
}

function changeQty(id, delta) {
  for (let i = 0; i < panier.length; i++) {
    if (panier[i].id !== id) continue;

    panier[i].quantity = panier[i].quantity + delta;

    if (panier[i].quantity <= 0) {
      panier.splice(i, 1);
    }
    break;
  }

  sauvegarderPanier();
  renderCart();
}

function renderCart() {
  if (panier.length === 0) {
    panierDiv.innerHTML = "<p class='text-gray-500'>Panier vide, par pitié commande un truc j'ai besoin d'argent la france à Macron c'est dur</p>";
    btnCommander.disabled = true;
    totalSpan.textContent = "0.00 €";
    return;
  }

  let html = "";
  panier.forEach(function (ligne) {
    html += `
      <div class="flex justify-between items-center mb-3">
        <div>
          <strong>${ligne.name}</strong>
          <div class="text-gray-500 text-sm">${ligne.price.toFixed(2)} €</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="border border-gray-300 px-2 py-1 rounded text-sm" onclick="changeQty(${ligne.id}, -1)">-</button>
          <span>${ligne.quantity}</span>
          <button class="border border-gray-300 px-2 py-1 rounded text-sm" onclick="changeQty(${ligne.id}, 1)">+</button>
        </div>
      </div>
    `;
  });

  panierDiv.innerHTML = html;
  totalSpan.textContent = getTotal().toFixed(2) + " €";
  btnCommander.disabled = false;
}

function showSummary() {
  const ht = getTotal();
  const montantTva = ht * tva;
  const ttc = ht + montantTva;
  let html = "<ul class='divide-y border rounded mb-4'>";

  panier.forEach(function (ligne) {
    html += `<li class="flex justify-between p-2">
      <span>${ligne.name} x ${ligne.quantity}</span>
      <span>${(ligne.price * ligne.quantity).toFixed(2)} €</span>
    </li>`;
  });

  html += `</ul>
    <p class="flex justify-between mb-1">Prix HT <span>${ht.toFixed(2)} €</span></p>
    <p class="flex justify-between mb-1">TVA 20% <span>${montantTva.toFixed(2)} €</span></p>
    <p class="flex justify-between font-bold">Total TTC <span>${ttc.toFixed(2)} €</span></p>`;

  recapDiv.innerHTML = html;
  openModal();
}

async function fakePostCommande() {
  await pause(1500);
  if (Math.random() < 0.1) {
    throw new Error("error try again");
  }
}

async function confirmOrder() {
  if (compterCommandesEnCours() >= limiteCommandes) {
    showToast("maximum 5 frerot abuse pas mdr", true);
    return;
  }

  const ht = getTotal();
  const copiePanier = JSON.parse(JSON.stringify(panier));
  const cmd = {
    id: Date.now(),
    items: copiePanier,
    total: ht + ht * tva,
    status: "preparation",
  };

  try {
    await fakePostCommande();
    commandes.push(cmd);
    panier = [];
    sauvegarderPanier();
    sauvegarderCommandes();
    renderCart();
    renderOrders();
    closeModal();
    showToast("Commande validée !", false);
    suivreCommande(cmd.id);
  } catch (e) {
    showToast(e.message, true);
  }
}

function renderOrders() {
  const actives = commandes.filter(function (cmd) {
    return cmd.status !== "livre" && cmd.status !== "annulee";
  });

  if (actives.length === 0) {
    commandesDiv.innerHTML = "<p class='text-gray-500'>Y'a R ça sert à rien de regarder.</p>";
    return;
  }

  let html = "";
  actives.forEach(function (cmd) {
    const detail = cmd.items.map(function (a) {
      return a.name + " x" + a.quantity;
    }).join(", ");

    html += `
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="font-semibold">Commande #${cmd.id}</h3>
        <p class="text-sm text-gray-500 mt-1">${detail}</p>
        <p class="font-bold mt-2">${cmd.total.toFixed(2)} € TTC</p>
        <p class="mt-2"><strong>État : ${libellesStatut[cmd.status]}</strong></p>
        ${cmd.status === "preparation" ? `<button class="mt-3 border border-red-500 text-red-500 px-3 py-1 rounded text-sm hover:bg-red-50" onclick="annulerCommande(${cmd.id})">Annuler</button>` : ""}
      </div>
    `;
  });

  commandesDiv.innerHTML = html;
}

function annulerCommande(id) {
  const cmd = commandes.find(function (c) { return c.id === id; });
  if (!cmd || cmd.status !== "preparation") return;

  cmd.status = "annulee";
  sauvegarderCommandes();
  renderOrders();
  showToast("Commande annulé, t'es content maintenant on va jeter ton plat dans la seine", false);
}

async function suivreCommande(id) {
  await pause(3000);

  let cmd = commandes.find(function (c) { return c.id === id; });
  if (!cmd || cmd.status === "annulee") return;

  cmd.status = "livraison";
  sauvegarderCommandes();
  renderOrders();

  await pause(4000);

  cmd = commandes.find(function (c) { return c.id === id; });
  if (!cmd || cmd.status === "annulee") return;

  cmd.status = "livre";
  sauvegarderCommandes();
  renderOrders();
  showToast("Commande livrée !", false);
}

btnCommander.onclick = showSummary;
document.getElementById("btn-confirm-order").onclick = confirmOrder;
document.getElementById("btn-close-modal").onclick = closeModal;
document.getElementById("btn-cancel-modal").onclick = closeModal;

loadMenu();
renderCart();
renderOrders();

commandes.forEach(function (cmd) {
  if (cmd.status === "preparation" || cmd.status === "livraison") {
    suivreCommande(cmd.id);
  }
});
