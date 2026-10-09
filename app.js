// State Management
let leads = [];
let currentCallTimer = null;
let currentCallSeconds = 0;
let currentActiveLead = null;

// Google Apps Script Web App URL (Placeholder - to be replaced by the user)
const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbwtcIJ6FVgcBPyvhZDjPs8mkSJyLu7rNEKZRIf456sqb4A4mtl27uzf7z3rInE2KFMQrg/exec";

// DOM Elements
const tbody = document.getElementById('leadsTableBody');
const addLeadModal = document.getElementById('addLeadModal');
const callModal = document.getElementById('callModal');
const addLeadForm = document.getElementById('addLeadForm');
const statusFilter = document.getElementById('statusFilter');
const globalSearchInput = document.getElementById('globalSearchInput');

// Dummy Data to show UI capabilities before Google Sheets is connected
const dummyData = [
    { id: 1, name: "Alice Johnson", phone: "+1 415 555 1001", email: "alice@example.com", source: "Website", status: "level_basic", followUp: "Today", company: "TechCorp", city: "Pune", course: "Data Science", agent: "John Doe", history: [], remarks: [] },
    { id: 2, name: "Michael Smith", phone: "+1 415 555 1002", email: "mike@example.com", source: "Referral", status: "level_1", followUp: "Tomorrow", company: "Retail Inc", city: "Mumbai", course: "AI Engineering", agent: "Jane Smith", history: [{type: 'activity', date: new Date().toLocaleString(), text: 'Logged Activity: Followup Required'}], remarks: [] },
    { id: 3, name: "Samantha Lee", phone: "+1 415 555 1003", email: "sam@example.com", source: "Cold Call", status: "level_3", followUp: "10 Oct 2026", company: "Services LLC", city: "Delhi", course: "Web Dev", agent: "John Doe", history: [{type: 'activity', date: new Date().toLocaleString(), text: 'Logged Activity: Counseling/Visit Booked'}], remarks: [{type: 'remark', date: new Date().toLocaleString(), text: 'Client seems very interested in the weekend batch.'}] },
    { id: 4, name: "David Chen", phone: "+1 415 555 1004", email: "david@example.com", source: "Social Media", status: "level_done", followUp: "-", company: "Startup AI", city: "Bangalore", course: "Data Science", agent: "Alex V", history: [], remarks: [] },
];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // If no real API URL, use dummy data to demonstrate UI
    if (GOOGLE_SHEETS_API_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
        leads = [...dummyData];
        renderLeads();
        updateStats();
        showToast("Showing demo data. Please connect to Google Sheets.");
    } else {
        fetchLeads();
    }
});

// View Navigation
function switchView(viewId, element) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.getElementById(viewId).style.display = 'block';
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
}

// Fetch Leads from Google Sheets
async function fetchLeads() {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center"><i class="ph ph-spinner ph-spin"></i> Fetching from Google Sheets...</td></tr>`;
    
    if (GOOGLE_SHEETS_API_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
        setTimeout(() => {
            leads = [...dummyData];
            renderLeads();
            updateStats();
            showToast("Sync completed (Demo Data)");
        }, 1000);
        return;
    }

    try {
        const response = await fetch(GOOGLE_SHEETS_API_URL + "?action=getLeads");
        const data = await response.json();
        leads = data;
        renderLeads();
        updateStats();
        showToast("Successfully synced with Google Sheets");
    } catch (error) {
        console.error("Error fetching leads:", error);
        showToast("Error connecting to Google Sheets");
        renderLeads();
    }
}

// Render Leads Table
function renderLeads() {
    const filterValue = statusFilter.value;
    const searchQuery = globalSearchInput.value.toLowerCase().trim();
    
    const filteredLeads = leads.filter(lead => {
        if (filterValue !== 'all' && lead.status !== filterValue) return false;
        if (searchQuery) {
            const searchStr = `${lead.name} ${lead.phone} ${lead.email || ''}`.toLowerCase();
            if (!searchStr.includes(searchQuery)) return false;
        }
        return true;
    });
    
    tbody.innerHTML = '';
    
    if (filteredLeads.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">No leads found.</td></tr>`;
        return;
    }

    filteredLeads.forEach(lead => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>
                <div class="lead-name-cell">
                    <div class="lead-avatar" style="background-color: ${getColorForName(lead.name)}">${getInitials(lead.name)}</div>
                    <div>
                        <div class="lead-name">${lead.name}</div>
                        <div class="lead-company">${lead.company || lead.source}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="contact-info">
                    <span class="contact-item"><i class="ph ph-phone"></i> ${lead.phone}</span>
                    ${lead.email ? `<span class="contact-item"><i class="ph ph-envelope-simple"></i> ${lead.email}</span>` : ''}
                </div>
            </td>
            <td>${lead.source}</td>
            <td><span class="status-badge status-${lead.status}">${formatStatus(lead.status)}</span></td>
            <td>${lead.followUp}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="openCallModal(${lead.id})"><i class="ph ph-phone"></i> Call</button>
                    <button class="btn btn-outline btn-sm" onclick="openLeadDrawer(${lead.id})"><i class="ph ph-eye"></i> View</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    renderOtherViews();
}

function renderOtherViews() {
    const tasksBody = document.getElementById('tasksTableBody');
    const logsBody = document.getElementById('callLogsTableBody');
    
    // Tasks: Leads with followUp Today or Tomorrow (or any valid date) that aren't done
    const tasks = leads.filter(l => l.followUp && l.followUp !== 'Pending' && l.followUp !== '-' && l.status !== 'level_done');
    tasksBody.innerHTML = tasks.length ? tasks.map(t => `
        <tr>
            <td><strong>${t.name}</strong><br><small>${t.course || 'Unknown Course'}</small></td>
            <td><span class="status-badge status-level_1">${t.followUp}</span></td>
            <td>${t.phone}</td>
            <td><button class="btn btn-primary btn-sm" onclick="openCallModal(${t.id})">Call Now</button></td>
        </tr>
    `).join('') : `<tr><td colspan="4" class="text-center">No pending tasks!</td></tr>`;

    // Call Logs: Flatten all activity history from all leads
    const allLogs = [];
    leads.forEach(l => {
        if(l.history) {
            l.history.filter(h => h.type === 'activity').forEach(h => {
                allLogs.push({ leadName: l.name, agent: l.agent || 'Unknown', date: h.date, text: h.text });
            });
        }
    });
    
    allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
    logsBody.innerHTML = allLogs.length ? allLogs.map(log => `
        <tr>
            <td>${log.date}</td>
            <td><strong>${log.leadName}</strong></td>
            <td>${log.text.replace('Logged Activity: ', '')}</td>
            <td>${log.agent}</td>
        </tr>
    `).join('') : `<tr><td colspan="4" class="text-center">No call logs yet.</td></tr>`;
}

// Status Formatting & Styling Helper
function formatStatus(status) {
    const map = {
        'level_basic': 'Basic',
        'level_0': 'Lvl 0: Not Picked',
        'level_1': 'Lvl 1: Call Back',
        'level_2': 'Lvl 2: Overview',
        'level_3': 'Lvl 3: Ready',
        'level_4': 'Lvl 4: Positive',
        'level_done': 'Admission Done'
    };
    return map[status] || status;
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function getColorForName(name) {
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function updateStats() {
    document.getElementById('stat-total').innerText = leads.length;
    document.getElementById('stat-calls').innerText = Math.floor(Math.random() * 50) + 20; // Demo
    document.getElementById('stat-followups').innerText = leads.filter(l => l.status === 'level_1' || l.status === 'level_2').length;
    document.getElementById('stat-converted').innerText = leads.filter(l => l.status === 'level_done').length;
}

// Event Listeners
statusFilter.addEventListener('change', renderLeads);
globalSearchInput.addEventListener('input', renderLeads);

addLeadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveLeadBtn');
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Saving...';
    btn.disabled = true;

    const newLead = {
        id: Date.now(),
        name: document.getElementById('leadName').value,
        phone: document.getElementById('leadPhone').value,
        email: document.getElementById('leadEmail').value,
        city: document.getElementById('leadCity').value,
        course: document.getElementById('leadCourse').value,
        agent: document.getElementById('leadAgent').value,
        source: document.getElementById('leadSource').value,
        status: 'level_basic',
        followUp: 'Pending',
        notes: document.getElementById('leadNotes').value,
        history: [],
        remarks: document.getElementById('leadNotes').value ? [{type: 'remark', date: new Date().toLocaleString(), text: document.getElementById('leadNotes').value}] : []
    };

    // Actual API Call to Google Sheets
    try {
        await fetch(GOOGLE_SHEETS_API_URL + "?action=addLead", {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(newLead)
        });
        leads.unshift(newLead);
        renderLeads();
        updateStats();
        closeAddLeadModal();
        addLeadForm.reset();
        showToast("Lead successfully added to Google Sheets!");
    } catch(err) {
        showToast("Error saving lead");
    } finally {
        btn.innerHTML = 'Save to Sheets';
        btn.disabled = false;
    }
});

// Modals
function openAddLeadModal() { addLeadModal.classList.add('active'); }
function closeAddLeadModal() { addLeadModal.classList.remove('active'); }

function openCallModal(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if(!lead) return;
    
    currentActiveLead = lead;
    document.getElementById('callLeadName').innerText = lead.name;
    document.getElementById('callLeadPhone').innerText = lead.phone;
    document.getElementById('callLeadAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(lead.name)}&background=f3f4f6&color=374151`;
    
    // Reset Call State
    document.getElementById('startCallBtn').style.display = 'block';
    document.getElementById('endCallBtn').style.display = 'none';
    document.getElementById('callOutcomeSection').style.display = 'none';
    document.getElementById('callTimer').innerText = "00:00";
    currentCallSeconds = 0;
    
    callModal.classList.add('active');
}

function closeCallModal() {
    if(currentCallTimer) clearInterval(currentCallTimer);
    callModal.classList.remove('active');
}

// Drawer Logic
function openLeadDrawer(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if(!lead) return;
    currentActiveLead = lead;
    
    document.getElementById('drawerLeadName').innerText = lead.name;
    document.getElementById('drawerLeadPhone').innerText = lead.phone;
    document.getElementById('drawerLeadEmail').innerText = lead.email || 'N/A';
    document.getElementById('drawerLeadCity').innerText = lead.city || 'N/A';
    document.getElementById('drawerLeadCourse').innerText = lead.course || 'N/A';
    document.getElementById('drawerLeadAgent').innerText = lead.agent || 'Unassigned';
    document.getElementById('drawerLeadStatus').innerText = formatStatus(lead.status);
    
    renderTimeline(lead);
    
    document.getElementById('leadDrawer').classList.add('active');
    document.getElementById('leadDrawerOverlay').classList.add('active');
}

function closeLeadDrawer() {
    document.getElementById('leadDrawer').classList.remove('active');
    document.getElementById('leadDrawerOverlay').classList.remove('active');
}

function renderTimeline(lead) {
    const timeline = document.getElementById('drawerTimeline');
    const allItems = [...(lead.history || []), ...(lead.remarks || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if(allItems.length === 0) {
        timeline.innerHTML = '<p style="color: #64748b; font-size: 0.85rem;">No activity yet.</p>';
        return;
    }
    
    timeline.innerHTML = allItems.map(item => `
        <div class="timeline-item ${item.type === 'remark' ? 'remark-item' : ''}">
            <div class="timeline-date">${item.date}</div>
            <div class="timeline-content">
                ${item.type === 'remark' ? '<strong>Note:</strong> ' : ''}${item.text}
            </div>
        </div>
    `).join('');
}

document.getElementById('addRemarkForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = 'Saving...';
    btn.disabled = true;

    const text = document.getElementById('remarkText').value;
    if(!currentActiveLead.remarks) currentActiveLead.remarks = [];
    
    currentActiveLead.remarks.unshift({
        type: 'remark',
        date: new Date().toLocaleString(),
        text: text
    });
    
    try {
        await fetch(GOOGLE_SHEETS_API_URL + "?action=updateLead", {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(currentActiveLead)
        });
        document.getElementById('remarkText').value = '';
        renderTimeline(currentActiveLead);
        showToast("Remark added successfully!");
    } catch(err) {
        showToast("Error saving remark");
    } finally {
        btn.innerHTML = 'Save Remark';
        btn.disabled = false;
    }
});

// Calling Logic
document.getElementById('startCallBtn').addEventListener('click', () => {
    document.getElementById('startCallBtn').style.display = 'none';
    document.getElementById('endCallBtn').style.display = 'block';
    
    currentCallSeconds = 0;
    currentCallTimer = setInterval(() => {
        currentCallSeconds++;
        const m = Math.floor(currentCallSeconds / 60).toString().padStart(2, '0');
        const s = (currentCallSeconds % 60).toString().padStart(2, '0');
        document.getElementById('callTimer').innerText = `${m}:${s}`;
    }, 1000);
});

document.getElementById('endCallBtn').addEventListener('click', () => {
    clearInterval(currentCallTimer);
    document.getElementById('endCallBtn').style.display = 'none';
    document.getElementById('callOutcomeSection').style.display = 'block';
});

document.getElementById('callOutcomeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = 'Saving...';
    btn.disabled = true;

    const outcome = document.getElementById('activityType').value;
    if(!outcome) {
        showToast("Please select an activity first");
        btn.innerHTML = 'Save Outcome';
        btn.disabled = false;
        return;
    }
    
    if(currentActiveLead) {
        if(!currentActiveLead.history) currentActiveLead.history = [];
        currentActiveLead.history.unshift({
            type: 'activity',
            date: new Date().toLocaleString(),
            text: `Logged Activity: ${outcome}`
        });

        if(outcome === 'Call Done, Did Not Picked') currentActiveLead.status = 'level_0';
        else if(outcome === 'Followup Required') currentActiveLead.status = 'level_1';
        else if(outcome === 'Program Overview Shared') currentActiveLead.status = 'level_2';
        else if(outcome === 'Counseling/Visit Booked') currentActiveLead.status = 'level_3';
        else if(outcome === 'Counseling/Visit Done' || outcome === 'Interested in Course') currentActiveLead.status = 'level_4';
        else if(outcome === 'Admission Done') currentActiveLead.status = 'level_done';
        
        try {
            await fetch(GOOGLE_SHEETS_API_URL + "?action=updateLead", {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(currentActiveLead)
            });
            renderLeads();
            updateStats();
            showToast(`Activity Logged: ${outcome}`);
            closeCallModal();
        } catch(err) {
            showToast("Error saving activity");
        } finally {
            btn.innerHTML = 'Save Outcome';
            btn.disabled = false;
        }
    }
});

// CSV Export
function exportToCSV() {
    if (leads.length === 0) {
        showToast("No data to export!");
        return;
    }
    
    const exportData = leads.map(lead => ({
        ID: lead.id,
        Name: lead.name,
        Phone: lead.phone,
        Email: lead.email || '',
        City: lead.city || '',
        Course: lead.course || '',
        Agent: lead.agent || '',
        Source: lead.source || '',
        Status: formatStatus(lead.status),
        NextFollowUp: lead.followUp || '',
        Company: lead.company || ''
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `GLOBXT_HIVE_Leads_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Export successful!");
}

// CSV Import
document.getElementById('csvFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const parsedData = results.data;
            let importedCount = 0;
            
            parsedData.forEach(row => {
                if (row.Name && row.Phone) {
                    const newLead = {
                        id: row.ID || Date.now() + Math.floor(Math.random() * 1000),
                        name: row.Name,
                        phone: row.Phone,
                        email: row.Email || '',
                        city: row.City || '',
                        course: row.Course || '',
                        agent: row.Agent || '',
                        source: row.Source || 'Import',
                        status: 'level_basic',
                        followUp: row.NextFollowUp || 'Pending',
                        company: row.Company || '',
                        history: [],
                        remarks: []
                    };
                    leads.unshift(newLead);
                    importedCount++;
                }
            });

            if (importedCount > 0) {
                renderLeads();
                updateStats();
                showToast(`Successfully imported ${importedCount} leads!`);
            } else {
                showToast("No valid leads found in CSV. Make sure headers are Name, Phone, etc.");
            }
            
            document.getElementById('csvFileInput').value = '';
        },
        error: function(err) {
            showToast("Error parsing CSV file.");
        }
    });
});

// Toast
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}
