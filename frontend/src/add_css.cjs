const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, 'index.css');

const css = `
/* ============================================================
   TABLE ACTION BUTTONS
============================================================ */
.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  cursor: pointer;
  padding: 0;
}

.action-btn.edit {
  background: rgba(59,130,246,0.1) !important;
  border: 1px solid rgba(59,130,246,0.25) !important;
  color: #3b82f6 !important;
}
.action-btn.edit:hover {
  background: rgba(59,130,246,0.2) !important;
}

.action-btn.delete {
  background: rgba(226,39,83,0.1) !important;
  border: 1px solid rgba(226,39,83,0.25) !important;
  color: #E22753 !important;
}
.action-btn.delete:hover {
  opacity: 0.75;
}

.action-btn.hide {
  background: rgba(107,114,128,0.1) !important;
  border: 1px solid rgba(107,114,128,0.25) !important;
  color: #6b7280 !important;
}
.action-btn.hide:hover {
  background: rgba(107,114,128,0.2) !important;
}

.action-btn.lock {
  background: rgba(245,158,11,0.1) !important;
  border: 1px solid rgba(245,158,11,0.25) !important;
  color: #f59e0b !important;
}
.action-btn.lock:hover {
  background: rgba(245,158,11,0.2) !important;
}

.action-btn.restore {
  background: rgba(16,185,129,0.1) !important;
  border: 1px solid rgba(16,185,129,0.25) !important;
  color: #10b981 !important;
}
.action-btn.restore:hover {
  background: rgba(16,185,129,0.2) !important;
}
`;

fs.appendFileSync(cssPath, css);
console.log('CSS added');

const adminPagesDir = path.join(__dirname, 'features/admin/pages');
const staffPagesDir = path.join(__dirname, 'features/staff/pages');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Replace Edit style
  content = content.replace(/style=\{\{\s*color:\s*'#3b82f6',\s*background:\s*'none',\s*border:\s*'none',\s*cursor:\s*'pointer',\s*padding:\s*0\s*\}\}/g, 'className="action-btn edit"');

  // Replace Delete style
  content = content.replace(/style=\{\{\s*color:\s*'#E22753',\s*background:\s*'none',\s*border:\s*'none',\s*cursor:\s*'pointer',\s*padding:\s*0\s*\}\}/g, 'className="action-btn delete"');

  // Replace dynamic Hide/Edit styles (e.g. color: m.isHidden ? '#6b7280' : '#3b82f6')
  content = content.replace(/style=\{\{\s*color:\s*([a-zA-Z0-9_\.]+)\s*\?\s*'#6b7280'\s*:\s*'#3b82f6',\s*background:\s*'none',\s*border:\s*'none',\s*cursor:\s*'pointer',\s*padding:\s*0\s*\}\}/g, (match, p1) => {
    return 'className={`action-btn ${' + p1 + ' ? \'hide\' : \'edit\'}`}';
  });
  
  // Replace dynamic Hide/Restore (orange) styles
  content = content.replace(/style=\{\{\s*color:\s*([a-zA-Z0-9_\.]+)\s*\?\s*'#f59e0b'\s*:\s*'#6b7280',\s*background:\s*'none',\s*border:\s*'none',\s*cursor:\s*'pointer',\s*padding:\s*0\s*\}\}/g, (match, p1) => {
    return 'className={`action-btn ${' + p1 + ' ? \'lock\' : \'hide\'}`}';
  });

  // Replace Khôi phục
  content = content.replace(/style=\{\{\s*color:\s*'#10b981',\s*background:\s*'none',\s*border:\s*'none',\s*cursor:\s*'pointer',\s*padding:\s*0,\s*fontWeight:\s*600,\s*fontSize:\s*'12px'\s*\}\}/g, 'className="action-btn restore" style={{ width: \'auto\', padding: \'0 12px\', fontSize: \'12px\', fontWeight: 600 }}');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Updated', path.basename(filePath));
  }
}

const adminFiles = fs.readdirSync(adminPagesDir).filter(f => f.endsWith('.jsx'));
for (const f of adminFiles) processFile(path.join(adminPagesDir, f));

const staffFiles = fs.readdirSync(staffPagesDir).filter(f => f.endsWith('.jsx'));
for (const f of staffFiles) processFile(path.join(staffPagesDir, f));

console.log('Done!');
