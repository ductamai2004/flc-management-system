// =============================================================================
// finance.js — Quan ly Tai chinh (Thu, Chi, Quy thanh vien)
// =============================================================================

const Finance = (() => {
  const API = '';
  const DEFAULT_FUND_AMOUNT = 20000;

  let _transactions = [];
  let _funds = [];
  let _members = [];
  let _currentTab = 'transactions';

  // Helpers
  function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function getCurrentMonth() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  function buildMonthOptions() {
    const select = document.getElementById('fundMonthSelect');
    if (!select) return;
    select.innerHTML = '';
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `Thang ${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      if (i === 0) opt.selected = true;
      select.appendChild(opt);
    }
  }

  // Load data
  async function loadSummary() {
    try {
      const res = await fetch('/api/stats');
      const json = await res.json();
      if (json.success && json.data.finance) {
        const f = json.data.finance;
        document.getElementById('financeTotalFund').textContent = formatCurrency(f.totalFund);
        document.getElementById('financeMonthIncome').textContent = formatCurrency(f.currentMonthIncome);
        document.getElementById('financeMonthExpense').textContent = formatCurrency(f.currentMonthExpense);
      }
    } catch (e) {
      console.error('Finance summary error:', e);
    }
  }

  async function loadTransactions() {
    try {
      const res = await fetch('/api/finance/transactions');
      const json = await res.json();
      if (json.success) {
        _transactions = json.data;
        renderTransactions();
      }
    } catch (e) {
      console.error('Load transactions error:', e);
    }
  }

  async function loadFunds() {
    const monthSelect = document.getElementById('fundMonthSelect');
    const month = monthSelect ? monthSelect.value : getCurrentMonth();
    try {
      const [fundsRes, membersRes] = await Promise.all([
        fetch('/api/finance/funds'),
        fetch('/api/members')
      ]);
      const fundsJson = await fundsRes.json();
      const membersJson = await membersRes.json();
      if (fundsJson.success) _funds = fundsJson.data;
      if (membersJson.success) _members = membersJson.data.filter(m => m.active);
      renderFunds(month);
    } catch (e) {
      console.error('Load funds error:', e);
    }
  }

  // Render
  function renderTransactions() {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;
    if (!_transactions.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)">Chua co giao dich nao</td></tr>';
      return;
    }
    tbody.innerHTML = _transactions.map(tx => {
      const isIncome = tx.type === 'income';
      const typeBadge = isIncome
        ? '<span style="background:rgb(220,252,231);color:rgb(22,163,74);padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">▲ Thu</span>'
        : '<span style="background:rgb(254,226,226);color:rgb(220,38,38);padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">▼ Chi</span>';
      const amountColor = isIncome ? 'color:rgb(22,163,74)' : 'color:rgb(220,38,38)';
      const amountSign = isIncome ? '+' : '-';
      return `<tr>
        <td>${formatDate(tx.date)}</td>
        <td>${typeBadge}</td>
        <td><span style="font-size:12px;background:var(--bg-secondary);padding:2px 8px;border-radius:6px">${tx.category}</span></td>
        <td>${tx.description}</td>
        <td style="text-align:right;font-weight:700;${amountColor}">${amountSign}${formatCurrency(tx.amount)}</td>
        <td style="text-align:center">
          <button class="btn btn-danger btn-sm" onclick="Finance.deleteTransaction('${tx.id}')" style="padding:4px 10px;font-size:12px">&#128465;</button>
        </td>
      </tr>`;
    }).join('');
  }

  function renderFunds(month) {
    const tbody = document.getElementById('fundsTableBody');
    const badge = document.getElementById('fundSummaryBadge');
    if (!tbody) return;
    const monthFunds = _funds.filter(f => f.month === month);
    const paidMemberIds = new Set(monthFunds.map(f => f.memberId));
    const paidCount = monthFunds.length;
    const totalCount = _members.length;
    if (badge) badge.textContent = `Da nop: ${paidCount}/${totalCount} nguoi — Tong: ${formatCurrency(paidCount * DEFAULT_FUND_AMOUNT)}`;
    if (!_members.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted)">Chua co thanh vien nao</td></tr>';
      return;
    }
    tbody.innerHTML = _members.map((member, idx) => {
      const isPaid = paidMemberIds.has(member.id);
      const fundRecord = monthFunds.find(f => f.memberId === member.id);
      const statusBadge = isPaid
        ? '<span style="background:rgb(220,252,231);color:rgb(22,163,74);padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600;">&#10003; Da nop</span>'
        : '<span style="background:rgb(254,226,226);color:rgb(220,38,38);padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600;">&#10007; Chua nop</span>';
      const actionBtn = isPaid
        ? `<button class="btn btn-ghost btn-sm" onclick="Finance.cancelFund('${fundRecord.id}')" style="padding:4px 10px;font-size:12px;color:var(--text-muted)">Huy nop</button>`
        : `<button class="btn btn-primary btn-sm" onclick="Finance.collectFund('${member.id}', '${month}')" style="padding:4px 10px;font-size:12px;">&#128176; Thu tien</button>`;
      const amountText = isPaid
        ? `<span style="font-weight:700;color:rgb(22,163,74)">${formatCurrency(fundRecord.amount)}</span>`
        : `<span style="color:var(--text-muted)">${formatCurrency(DEFAULT_FUND_AMOUNT)}</span>`;
      return `<tr>
        <td>${idx + 1}</td>
        <td style="font-weight:600">${member.name}</td>
        <td style="color:var(--text-muted)">${member.mssv || '—'}</td>
        <td style="color:var(--text-muted)">${member.lop || '—'}</td>
        <td style="text-align:center">${statusBadge}</td>
        <td style="text-align:center">${amountText}</td>
        <td style="text-align:center">${actionBtn}</td>
      </tr>`;
    }).join('');
  }

  // Tab
  function switchTab(tab) {
    _currentTab = tab;
    const txDiv = document.getElementById('financeTabTransactions');
    const fundDiv = document.getElementById('financeTabFunds');
    const btnTx = document.getElementById('tabTransactions');
    const btnFund = document.getElementById('tabFunds');
    if (tab === 'transactions') {
      if (txDiv) txDiv.style.display = '';
      if (fundDiv) fundDiv.style.display = 'none';
      if (btnTx) btnTx.classList.add('active');
      if (btnFund) btnFund.classList.remove('active');
    } else {
      if (txDiv) txDiv.style.display = 'none';
      if (fundDiv) fundDiv.style.display = '';
      if (btnTx) btnTx.classList.remove('active');
      if (btnFund) btnFund.classList.add('active');
      loadFunds();
    }
  }

  // CRUD
  async function collectFund(memberId, month) {
    try {
      const res = await fetch('/api/finance/funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, month, amount: DEFAULT_FUND_AMOUNT })
      });
      const json = await res.json();
      if (json.success) {
        if (typeof showToast === 'function') showToast('Da ghi nhan nop quy!', 'success');
        await Promise.all([loadFunds(), loadTransactions(), loadSummary()]);
      } else {
        if (typeof showToast === 'function') showToast(json.message, 'error');
      }
    } catch (e) { console.error(e); }
  }

  async function cancelFund(fundId) {
    if (!confirm('Huy ghi nhan nop quy cua thanh vien nay?')) return;
    try {
      const res = await fetch(`/api/finance/funds/${fundId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        if (typeof showToast === 'function') showToast('Da huy nop quy', 'success');
        await Promise.all([loadFunds(), loadTransactions(), loadSummary()]);
      } else {
        if (typeof showToast === 'function') showToast(json.message, 'error');
      }
    } catch (e) { console.error(e); }
  }

  async function deleteTransaction(txId) {
    if (!confirm('Xoa giao dich nay? Thao tac khong the hoan tac.')) return;
    try {
      const res = await fetch(`/api/finance/transactions/${txId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        if (typeof showToast === 'function') showToast('Da xoa giao dich', 'success');
        await Promise.all([loadTransactions(), loadSummary()]);
      } else {
        if (typeof showToast === 'function') showToast(json.message, 'error');
      }
    } catch (e) { console.error(e); }
  }

  async function saveTransaction() {
    const type = document.getElementById('transactionFormType').value;
    const category = document.getElementById('transactionFormCategory').value;
    const amount = document.getElementById('transactionFormAmount').value;
    const date = document.getElementById('transactionFormDate').value;
    const description = document.getElementById('transactionFormDesc').value.trim();
    if (!amount || !date || !description) {
      if (typeof showToast === 'function') showToast('Vui long dien day du thong tin', 'warning');
      return;
    }
    const btn = document.getElementById('saveTransactionBtn');
    btn.disabled = true;
    btn.textContent = 'Dang luu...';
    try {
      const res = await fetch('/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, category, amount: Number(amount), date, description })
      });
      const json = await res.json();
      if (json.success) {
        if (typeof showToast === 'function') showToast('Da them giao dich!', 'success');
        closeModal('transactionModal');
        await Promise.all([loadTransactions(), loadSummary()]);
      } else {
        if (typeof showToast === 'function') showToast(json.message, 'error');
      }
    } catch (e) {
      console.error(e);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Luu giao dich';
    }
  }

  function openTransactionModal() {
    document.getElementById('transactionFormType').value = 'expense';
    document.getElementById('transactionFormCategory').value = 'Khac';
    document.getElementById('transactionFormAmount').value = '';
    document.getElementById('transactionFormDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('transactionFormDesc').value = '';
    openModal('transactionModal');
  }

  function init() {
    buildMonthOptions();
    const addBtn = document.getElementById('addTransactionBtn');
    if (addBtn) addBtn.addEventListener('click', openTransactionModal);
    const saveBtn = document.getElementById('saveTransactionBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveTransaction);
    const closeBtn = document.getElementById('closeTransactionModal');
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal('transactionModal'));
    const cancelBtn = document.getElementById('cancelTransactionBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal('transactionModal'));
    loadTransactions();
    loadSummary();
    switchTab('transactions');
  }

  return { init, switchTab, loadFunds, collectFund, cancelFund, deleteTransaction };
})();