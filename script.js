
const $ = id => document.getElementById(id);

const initialProducts = [
  {id:1,name:"Classic T-Shirt",description:"Everyday cotton tee",price:24.99,inventory:45},
  {id:2,name:"Canvas Tote",description:"Reusable everyday bag",price:18.00,inventory:28},
  {id:3,name:"Logo Hoodie",description:"Cozy fleece hoodie",price:49.99,inventory:12},
  {id:4,name:"Water Bottle",description:"Reusable steel bottle",price:16.50,inventory:0},
  {id:5,name:"Sticker Pack",description:"Five-piece sticker set",price:6.00,inventory:100}
];

const initialOrders = [
  {id:1001,customer:"Jordan Lee",date:"2026-10-15",status:"Paid",total:74.98},
  {id:1002,customer:"Taylor Smith",date:"2026-10-15",status:"Pending",total:24.99},
  {id:1003,customer:"Alex Morgan",date:"2026-10-14",status:"Fulfilled",total:66.49},
  {id:1004,customer:"Casey Brown",date:"2026-10-13",status:"Paid",total:18.00}
];

let products = structuredClone(initialProducts);
let orders = structuredClone(initialOrders);
let customers = [
  {name:"Jordan Lee",email:"jordan@example.com"},
  {name:"Taylor Smith",email:"taylor@example.com"},
  {name:"Alex Morgan",email:"alex@example.com"},
  {name:"Casey Brown",email:"casey@example.com"}
];
let sales = 2480;
let nextProductId = 6;
let currency = "USD";

function money(n){
  return new Intl.NumberFormat("en-US",{
    style:"currency",currency
  }).format(n);
}

function persist(){
  localStorage.setItem("storePilotData",JSON.stringify({
    products,orders,customers,sales,nextProductId,currency,
    storeName:$("storeName").value,
    background:$("backgroundColor").value,
    accent:$("accentColor").value
  }));
}

function restore(){
  try{
    const d=JSON.parse(localStorage.getItem("storePilotData"));
    if(!d)return;
    if(Array.isArray(d.products))products=d.products;
    if(Array.isArray(d.orders))orders=d.orders;
    if(Array.isArray(d.customers))customers=d.customers;
    if(Number.isFinite(d.sales))sales=d.sales;
    if(Number.isInteger(d.nextProductId))nextProductId=d.nextProductId;
    if(["USD","EUR","GBP","CAD"].includes(d.currency))currency=d.currency;
    $("storeName").value=d.storeName||"StorePilot";
    $("backgroundColor").value=d.background||"#f5f6f5";
    $("accentColor").value=d.accent||"#276749";
    $("currency").value=currency;
    applyAppearance();
  }catch(e){console.warn("Using default sample data.");}
}

function navigate(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===page));
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  const titles={dashboard:"Dashboard",products:"Products",orders:"Orders",customers:"Customers",analytics:"Analytics",settings:"Settings"};
  $("pageTitle").textContent=titles[page]||"Dashboard";
  renderAll();
}

$("navigation").addEventListener("click",e=>{
  const btn=e.target.closest("[data-page]");
  if(btn)navigate(btn.dataset.page);
});

function statusBadge(status){
  const span=document.createElement("span");
  span.className="status"+(status==="Pending"?" pending":status==="Cancelled"?" cancelled":"");
  span.textContent=status;
  return span;
}

function cell(row,value){
  const td=document.createElement("td");
  if(value instanceof Node)td.append(value);
  else td.textContent=value;
  row.append(td);
  return td;
}

function makeButton(label,action){
  const b=document.createElement("button");
  b.textContent=label;
  b.type="button";
  b.addEventListener("click",action);
  return b;
}

function renderOrders(){
  const rows=$("orderRows"),recent=$("recentOrders");
  rows.replaceChildren();recent.replaceChildren();
  const q=($("orderSearch")?.value||"").toLowerCase();

  orders.filter(o=>(o.customer+" "+o.id).toLowerCase().includes(q)).forEach(o=>{
    const tr=document.createElement("tr");
    cell(tr,"#"+o.id);
    cell(tr,o.customer);
    cell(tr,o.date);
    cell(tr,statusBadge(o.status));
    cell(tr,money(o.total));
    const actions=document.createElement("td");
    const select=document.createElement("select");
    ["Pending","Paid","Fulfilled","Cancelled"].forEach(s=>{
      const op=document.createElement("option");
      op.value=s;op.textContent=s;op.selected=s===o.status;
      select.append(op);
    });
    select.setAttribute("aria-label","Status for order "+o.id);
    select.addEventListener("change",()=>{o.status=select.value;persist();renderAll();});
    actions.append(select);tr.append(actions);rows.append(tr);
  });

  orders.slice(0,5).forEach(o=>{
    const tr=document.createElement("tr");
    cell(tr,"#"+o.id);cell(tr,o.customer);cell(tr,o.date);
    cell(tr,statusBadge(o.status));cell(tr,money(o.total));
    recent.append(tr);
  });
  $("orderCount").textContent=orders.length;
}

function renderProducts(){
  const rows=$("productRows");
  rows.replaceChildren();
  const q=$("productSearch").value.toLowerCase();
  const filtered=products.filter(p=>(p.name+" "+p.description).toLowerCase().includes(q));
  $("productCountLabel").textContent=filtered.length+" products";

  filtered.forEach(p=>{
    const tr=document.createElement("tr");
    const td=document.createElement("td");
    const wrapper=document.createElement("div");
    wrapper.className="product-cell";
    const icon=document.createElement("span");
    icon.className="product-icon";icon.textContent="▣";
    const text=document.createElement("div");
    const name=document.createElement("b");name.textContent=p.name;
    const desc=document.createElement("small");desc.textContent=p.description||"";
    text.append(name,desc);wrapper.append(icon,text);td.append(wrapper);tr.append(td);
    cell(tr,money(p.price));
    cell(tr,p.inventory);
    cell(tr,statusBadge(p.inventory>0?"Active":"Out of stock"));
    const actions=document.createElement("td");
    const group=document.createElement("div");group.className="row-actions";
    group.append(
      makeButton("Edit",()=>openProductForm(p.id)),
      makeButton("Delete",()=>deleteProduct(p.id))
    );
    actions.append(group);tr.append(actions);rows.append(tr);
  });
}

function openProductForm(id){
  $("productEditor").hidden=false;
  $("productForm").reset();
  $("productId").value="";
  $("productFormTitle").textContent="Add product";
  if(id!==undefined){
    const p=products.find(x=>x.id===id);
    if(!p)return;
    $("productId").value=p.id;
    $("productName").value=p.name;
    $("productDescription").value=p.description;
    $("productPrice").value=p.price;
    $("productInventory").value=p.inventory;
    $("productFormTitle").textContent="Edit product";
  }
  $("productEditor").scrollIntoView({behavior:"smooth",block:"start"});
}

function closeProductForm(){$("productEditor").hidden=true;}

$("productForm").addEventListener("submit",e=>{
  e.preventDefault();
  const id=Number($("productId").value);
  const p={
    id:id||nextProductId++,
    name:$("productName").value.trim(),
    description:$("productDescription").value.trim(),
    price:Number($("productPrice").value),
    inventory:Number($("productInventory").value)
  };
  if(!p.name||!Number.isFinite(p.price)||!Number.isFinite(p.inventory))return;
  if(id)products=products.map(x=>x.id===id?p:x);
  else products.unshift(p);
  closeProductForm();persist();renderAll();
});

function deleteProduct(id){
  if(!confirm("Delete this product from the local sample catalog?"))return;
  products=products.filter(p=>p.id!==id);
  persist();renderAll();
}

function renderCustomers(){
  const rows=$("customerRows");rows.replaceChildren();
  customers.forEach(c=>{
    const tr=document.createElement("tr");
    cell(tr,c.name);cell(tr,c.email);
    const matching=orders.filter(o=>o.customer===c.name);
    cell(tr,matching.length);
    cell(tr,money(matching.reduce((s,o)=>s+o.total,0)));
    rows.append(tr);
  });
}

function renderStats(){
  $("totalSales").textContent=money(sales);
  $("totalOrders").textContent=orders.length;
  $("totalProducts").textContent=products.length;
  $("totalCustomers").textContent=customers.length;
  $("analyticsSales").textContent=money(sales);
  $("averageOrder").textContent=money(orders.length?sales/orders.length:0);
}

function renderChart(){
  const chart=$("chart");chart.replaceChildren();
  const month=$("chartRange").value==="month";
  const labels=month
    ?["Week 1","Week 2","Week 3","Week 4"]
    :["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const values=month
    ?[380,620,490,990]
    :[180,350,240,460,320,580,350];

  labels.forEach((label,i)=>{
    const col=document.createElement("div");col.className="chart-column";
    const bar=document.createElement("div");bar.className="bar";
    bar.style.height=(values[i]/Math.max(...values)*125)+"px";
    bar.title=money(values[i]);
    const small=document.createElement("small");small.textContent=label;
    col.append(bar,small);chart.append(col);
  });
}

function renderAll(){
  renderStats();renderProducts();renderOrders();renderCustomers();renderChart();
}

function applyAppearance(){
  document.documentElement.style.setProperty("--accent",$("accentColor").value);
  document.documentElement.style.setProperty("--bg",$("backgroundColor").value);
  document.body.style.background=$("backgroundColor").value;
  const appName=$("storeName").value.trim()||"StorePilot";
  document.querySelector(".brand").lastChild.textContent=" "+appName;
  document.querySelector(".mobile-brand").textContent=appName;
}

function saveSettings(){
  currency=$("currency").value;
  applyAppearance();persist();renderAll();
  alert("Settings saved in this browser.");
}

function resetSettings(){
  $("storeName").value="StorePilot";
  $("currency").value="USD";
  $("backgroundColor").value="#f5f6f5";
  $("accentColor").value="#276749";
  saveSettings();
}

function exportStore(){
  persist();
  const blob=new Blob([localStorage.getItem("storePilotData")||"{}"],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download="storepilot-data.json";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function resetStore(){
  if(!confirm("Reset all sample products, orders, customers, and sales?"))return;
  localStorage.removeItem("storePilotData");
  products=structuredClone(initialProducts);
  orders=structuredClone(initialOrders);
  sales=2480;nextProductId=6;currency="USD";
  customers=[
    {name:"Jordan Lee",email:"jordan@example.com"},
    {name:"Taylor Smith",email:"taylor@example.com"},
    {name:"Alex Morgan",email:"alex@example.com"},
    {name:"Casey Brown",email:"casey@example.com"}
  ];
  resetSettings();renderAll();
}

$("productSearch").addEventListener("input",renderProducts);
$("orderSearch").addEventListener("input",renderOrders);
$("chartRange").addEventListener("change",renderChart);
$("backgroundColor").addEventListener("input",applyAppearance);
$("accentColor").addEventListener("input",applyAppearance);

restore();
renderAll();
