const cards = document.querySelector('#cards');
const empty = document.querySelector('#empty');
const searchInput = document.querySelector('#searchInput');
const sortSelect = document.querySelector('#sortSelect');
const filterButtons = [...document.querySelectorAll('.filter')];
const placeholderLogo = 'assets/icons/company-placeholder.svg';
const aliases = {'EPAM Systems':'EPAM Kazakhstan','BI Development':'BI Group / BI Development'};
const domains = {'RemoFirst':'remofirst.com','Higgsfield AI':'higgsfield.ai','Т-Банк':'tbank.ru','Ruby Labs':'rubylabs.com','Intetics':'intetics.com','Frontline Data Solutions':'frontlinedatasolutions.com','Сентрас Капитал':'centras.kz','F1servicecentre':'f1servicecentre.co.uk','Supabase':'supabase.com','Tether':'tether.to','Hopsule':'hopsule.com','Corsearch':'corsearch.com','AbeloHost':'abelohost.com','Zencoder':'zencoder.ai','Canonical':'canonical.com','Andersen':'andersenlab.com','ReactBD':'reactbd.com','Freedom Satellite':'freedomsat.kz','INFUSE':'infuse.com','Spotter AI':'spotter.ai'};
let companies = [];
let activeFilter = 'all';

const esc = value => String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const normalize = value => value.toLowerCase().replace(/[^a-zа-я0-9]/g,'');
const locationLabel = value => ({Astana:'Астана',Almaty:'Алматы',Karaganda:'Караганда',Kazakhstan:'Казахстан',Remote:'Удалённо'}[value] || value);
const people = company => [...(company.recruiters||[]),...(company.engineeringContacts||[])];
const domainOf = company => {
  if (company.website) { try { return new URL(company.website).hostname.replace(/^www\./,''); } catch {} }
  return domains[company.companyName];
};
const logoUrl = company => domainOf(company) ? `https://www.google.com/s2/favicons?domain=${domainOf(company)}&sz=128` : placeholderLogo;

function mergeData(jobs, recruiterCompanies){
  const map = new Map(recruiterCompanies.map(company=>[company.companyName,{...company,jobs:[]} ]));
  jobs.forEach(job=>{
    const targetName = aliases[job.company] || job.company;
    let company = map.get(targetName);
    if(!company){
      company={companyName:job.company,website:null,careersUrl:null,cities:[],remoteAvailable:'unknown',frontendStack:[],priority:'medium',recruiters:[],engineeringContacts:[],notes:'Компания добавлена из актуальной вакансии.',jobs:[]};
      map.set(job.company,company);
    }
    company.jobs.push({...job,type:job.type.split(' '),tags:job.summary.split(' · ')});
  });
  return [...map.values()];
}

function contactTemplate(company){
  const contacts=people(company);
  if(!contacts.length) return '<p class="no-contact">Публичный контакт пока не найден</p>';
  return `<div class="unified-contacts"><p class="card-label">Контакты</p>${contacts.map(person=>person.linkedinUrl?`<a href="${person.linkedinUrl}" target="_blank" rel="noopener"><span><b>${esc(person.fullName)}</b><small>${esc(person.position)}</small></span><i>↗</i></a>`:`<span class="no-contact"><b>${esc(person.fullName)}</b><small>${esc(person.position)}</small></span>`).join('')}</div>`;
}

function jobTemplate(job){
  return `<div class="job-entry"><div class="job-score"><span>${job.score}<small>/100</small></span><em>${esc(job.fresh)}</em></div><h3>${esc(job.title)}</h3><p class="summary">${esc(job.summary)}</p><p class="verdict"><strong>Почему в подборке</strong>${esc(job.verdict)}</p><div class="job-footer"><span class="location">${esc(job.place)}</span><a class="apply" href="${job.url}" target="_blank" rel="noopener">Вакансия ↗</a></div></div>`;
}

function companyTemplate(company){
  const contacts=people(company);
  const bestScore=Math.max(0,...company.jobs.map(job=>job.score));
  const cities=[...new Set([...(company.cities||[]),...company.jobs.flatMap(job=>job.place.split(' · ').slice(0,1))].map(locationLabel))];
  const stacks=[...new Set([...(company.frontendStack||[]),...company.jobs.flatMap(job=>job.tags)])].slice(0,6);
  return `<article class="card unified-card"><header class="unified-head"><div class="company"><span class="logo"><img src="${logoUrl(company)}" alt="" loading="lazy" onerror="this.src='${placeholderLogo}'"></span><span><b>${esc(company.companyName)}</b><small>${cities.map(esc).join(' · ')||'Формат уточняется'}</small></span></div><div class="company-metrics"><span>${company.jobs.length}<small>ролей</small></span><span>${contacts.length}<small>контактов</small></span>${bestScore?`<strong>${bestScore}<small>/100</small></strong>`:''}</div></header><div class="tags">${stacks.map(tag=>`<span class="tag">${esc(tag)}</span>`).join('')}</div>${company.jobs.length?`<div class="job-list">${company.jobs.sort((a,b)=>b.score-a.score).map(jobTemplate).join('')}</div>`:'<p class="no-vacancy">Открытая React-вакансия сейчас не подтверждена — компания сохранена для прямого обращения.</p>'}${contactTemplate(company)}${company.notes?`<p class="company-note">${esc(company.notes)}</p>`:''}</article>`;
}

function matches(company){
  const jobs=company.jobs;
  const allTypes=jobs.flatMap(job=>job.type);
  if(activeFilter==='vacancy'&&!jobs.length)return false;
  if(activeFilter==='contact'&&!people(company).length)return false;
  if(['remote','astana','almaty','frontend','mobile','adjacent'].includes(activeFilter)&&!allTypes.includes(activeFilter)&&!(company.cities||[]).some(city=>normalize(city)===activeFilter))return false;
  const query=normalize(searchInput.value);
  if(query&&!normalize([company.companyName,company.frontendStack?.join(' '),jobs.map(j=>`${j.title} ${j.summary}`).join(' ')].join(' ')).includes(query))return false;
  return true;
}

function sorted(items){
  const copy=[...items];
  if(sortSelect.value==='name')return copy.sort((a,b)=>a.companyName.localeCompare(b.companyName,'ru'));
  if(sortSelect.value==='contacts')return copy.sort((a,b)=>people(b).length-people(a).length||b.jobs.length-a.jobs.length);
  if(sortSelect.value==='vacancies')return copy.sort((a,b)=>b.jobs.length-a.jobs.length||Math.max(0,...b.jobs.map(j=>j.score))-Math.max(0,...a.jobs.map(j=>j.score)));
  return copy.sort((a,b)=>Math.max(0,...b.jobs.map(j=>j.score))-Math.max(0,...a.jobs.map(j=>j.score))||people(b).length-people(a).length);
}

function render(){const shown=sorted(companies.filter(matches));cards.innerHTML=shown.map(companyTemplate).join('');empty.hidden=shown.length>0;}
filterButtons.forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.filter;filterButtons.forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active))});render()}));
searchInput.addEventListener('input',render);sortSelect.addEventListener('change',render);

Promise.all([fetch('./assets/data/jobs.json').then(r=>r.json()),fetch('./assets/data/recruiters.json').then(r=>r.json())]).then(([jobData,recruiterData])=>{companies=mergeData(jobData.jobs,recruiterData.companies);document.querySelector('#totalCount').textContent=jobData.jobs.length;document.querySelector('#companyCount').textContent=companies.length;document.querySelector('#contactCount').textContent=companies.reduce((sum,company)=>sum+people(company).length,0);render()}).catch(()=>{cards.innerHTML='<p class="load-error">Не удалось загрузить каталог. Обновите страницу.</p>'});
