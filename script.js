let receiptLines = [];
let taxRate = 7.5;
let currentUser = null;
let registerTotal = 0;
let receiptHistory = [];
let users = {
  admin: { pin: "1234", isAdmin: true },
  staff: { pin: "0000", isAdmin: false }
};

// Track tab key for stock-adding
let tabHeld = false;
window.addEventListener("keydown", e => { if (e.key === "Tab") tabHeld = true; });
window.addEventListener("keyup", e => { if (e.key === "Tab") tabHeld = false; });

window.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initAddItemButton();
  initButtons();
  updateReceipt();
  updateRegisterDisplay();
});

/* Tabs (Food, Drinks, etc.) */
function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  const items = () => document.querySelectorAll(".item-btn");
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove("active-tab"));
      tab.classList.add("active-tab");
      items().forEach(btn => {
        btn.style.display = btn.dataset.group === tab.dataset.group ? "inline-block" : "none";
      });
    };
  });
  tabs[0].click();
}

/* Buttons (existing and newly added) */
function initButtons() {
  document.querySelectorAll(".item-btn").forEach(btn => {
    if (!btn.dataset.name) btn.dataset.name = "New";
    if (!btn.dataset.price) btn.dataset.price = "0.00";
    if (!btn.dataset.stock) btn.dataset.stock = "99";
    refreshBtnLabel(btn);

    btn.onclick = evt => {
      if (tabHeld && currentUser?.isAdmin) {
        const add = parseInt(prompt("Add how many to stock?", "1"));
        if (!isNaN(add)) {
          btn.dataset.stock = (+btn.dataset.stock + add).toString();
          refreshBtnLabel(btn);
        }
        return;
      }

      if (evt.ctrlKey && evt.altKey && currentUser?.isAdmin) {
        if (confirm(`Remove "${btn.dataset.name}" button?`)) btn.remove();
        return;
      }

      if (evt.ctrlKey && currentUser?.isAdmin) {
        const nn = prompt("New item name:", btn.dataset.name);
        if (nn) btn.dataset.name = nn;
        refreshBtnLabel(btn);
        return;
      }

      if (evt.shiftKey && currentUser?.isAdmin) {
        const np = prompt("New price:", btn.dataset.price);
        if (!isNaN(np)) {
          btn.dataset.price = parseFloat(np).toFixed(2);
          refreshBtnLabel(btn);
        }
        return;
      }

      if (+btn.dataset.stock <= 0) return alert("Out of stock");
      btn.dataset.stock = (+btn.dataset.stock - 1).toString();
      refreshBtnLabel(btn);

      let itemName = btn.dataset.name;
      if (evt.altKey) {
        const mod = prompt("Modifier (e.g. no cheese):");
        if (mod) itemName += ` (${mod})`;
      }

      receiptLines.push({ name: itemName, price: +btn.dataset.price });
      updateReceipt();
    };
  });
}

function refreshBtnLabel(b) {
  b.value = `${b.dataset.name}\n$${b.dataset.price}\nStock:${b.dataset.stock}`;
}

/* Add item button (fixed) */
function initAddItemButton() {
  document.getElementById("addItemBtn").onclick = () => {
    const n = prompt("Item name:");
    const p = parseFloat(prompt("Price:"));
    const g = prompt("Category (food/drinks/sides/dessert):").toLowerCase();
    const st = parseInt(prompt("Starting stock:"));
    if (!n || isNaN(p) || !["food", "drinks", "sides", "dessert"].includes(g) || isNaN(st))
      return alert("Invalid input.");

    const btn = document.createElement("input");
    btn.type = "button";
    btn.className = "item-btn";
    Object.assign(btn.dataset, { name: n, price: p.toFixed(2), stock: st, group: g });
    btn.style.width = "100px";
    btn.style.height = "75px";
    btn.style.margin = "5px";
    document.getElementById("itemsArea").appendChild(btn);
    initButtons();
    initTabs();
  };
}

/* Receipt updates */
function updateReceipt() {
  const box = document.getElementById("receiptBox");
  const disp = document.getElementById("totalDisplay");
  box.innerHTML = "<strong>Receipt:</strong><br>";
  receiptLines.forEach((line, i) => {
    const div = document.createElement("div");
    div.textContent = `${String(i + 1).padStart(2)}. ${line.name} - $${line.price.toFixed(2)}`;
    div.style.cursor = "pointer";
    div.onclick = () => {
      receiptLines.splice(i, 1);
      updateReceipt();
    };
    box.appendChild(div);
  });

  const sub = subtotal();
  const tax = sub * taxRate / 100;
  disp.textContent = `Total: $${(sub + tax).toFixed(2)} (Tax ${taxRate}%)`;
}

const subtotal = () => receiptLines.reduce((s, l) => s + l.price, 0);

function undoLastItem() {
  receiptLines.pop();
  updateReceipt();
}

function refundItem() {
  const i = parseInt(prompt("Refund line #:")) - 1;
  if (receiptLines[i]) {
    receiptLines.push({
      name: `${receiptLines[i].name} (REFUND)`,
      price: -receiptLines[i].price
    });
    updateReceipt();
  }
}

function resetReceipt() {
  receiptLines = [];
  updateReceipt();
}

function completeReceipt(method = "cash") {
  const total = subtotal() * (1 + taxRate / 100);
  registerTotal += total;
  updateRegisterDisplay();
  receiptLines.push({ name: `Payment: ${method.toUpperCase()}`, price: 0 });
  receiptHistory.push([...receiptLines]);
  resetReceipt();
}

function updateRegisterDisplay() {
  document.getElementById("registerTotalInput").value = registerTotal.toFixed(2);
}

/* Discounts */
function discountWholeReceipt() {
  const pc = parseFloat(prompt("Discount %:"));
  if (isNaN(pc)) return;
  receiptLines = receiptLines.map(l => ({
    name: `${l.name} (-${pc}%)`,
    price: +(l.price * (1 - pc / 100)).toFixed(2)
  }));
  updateReceipt();
}

function discountOneItem() {
  const i = parseInt(prompt("Line #:")) - 1;
  const pc = parseFloat(prompt("Discount %:"));
  if (isNaN(pc) || !receiptLines[i]) return;
  const it = receiptLines[i];
  it.price = +(it.price * (1 - pc / 100)).toFixed(2);
  it.name += ` (-${pc}%)`;
  updateReceipt();
}

/* Login system */
function loginUser() {
  const u = prompt("User:");
  const p = prompt("PIN:");
  if (users[u] && users[u].pin === p) {
    currentUser = { ...users[u], name: u };
    alert(`Logged in as ${u}`);
  } else alert("Invalid");
}

function logoutUser() {
  currentUser = null;
  alert("Logged out");
}

function addNewUser() {
  if (!currentUser?.isAdmin) return alert("Admins only");
  const u = prompt("Username:");
  const p = prompt("PIN:");
  const a = confirm("Admin?");
  if (u && p) {
    users[u] = { pin: p, isAdmin: a };
    alert("User added");
  }
}

/* Tax */
function changeTaxRate() {
  const p = prompt("Admin PIN:");
  const admin = Object.values(users).some(x => x.pin === p && x.isAdmin);
  if (!admin) return alert("Denied");
  const n = parseFloat(prompt("New tax %:", taxRate));
  if (!isNaN(n)) {
    taxRate = n;
    updateReceipt();
  }
}

/* Session order history */
function viewHistory() {
  let out = "Orders this session:\n";
  receiptHistory.forEach((r, i) => {
    out += `\nOrder #${i + 1}\n`;
    r.forEach(l => out += `- ${l.name} $${l.price.toFixed(2)}\n`);
  });
  alert(out || "No completed orders");
}
