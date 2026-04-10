import dayjs from "dayjs";

const fmt = (t) => {
  if (!t) return '—';
  const p = [];
  if (t.days > 0) p.push(t.days + 'd');
  if (t.hours > 0) p.push(t.hours + 'h');
  if (t.mins > 0) p.push(t.mins + 'm');
  return p.length ? p.join(' ') : '0m';
};

const statCell = (t) => {
  if (!t) return '<td style="padding:10px 14px;border-bottom:1px solid #e8eaed;text-align:center;color:#bdbdbd;">—</td>';
  const median = fmt(t.median || t);
  const p90 = t.p90 ? fmt(t.p90) : null;
  const avg = t.average ? fmt(t.average) : null;
  const sub = [p90 ? 'p90 ' + p90 : null, avg ? 'avg ' + avg : null].filter(Boolean).join(' · ');
  return `<td style="padding:10px 14px;border-bottom:1px solid #e8eaed;text-align:center;">
    <div style="font-size:14px;font-weight:700;color:#202124;">${median}</div>
    ${sub ? `<div style="font-size:10px;color:#9e9e9e;margin-top:2px;">${sub}</div>` : ''}
  </td>`;
};

const sc = (s) => {
  if (s === 'OK') return { bg:'#e6f4ea', fg:'#1a6e2e', label:'OK' };
  if (s === 'MAJOR_MISS') return { bg:'#fce8e6', fg:'#b31412', label:'Major miss' };
  if (s === 'MINOR_MISS') return { bg:'#fef7e0', fg:'#8a5000', label:'Minor miss' };
  return { bg:'#f1f3f4', fg:'#5f6368', label: s };
};

const kpiStyle = (k) => {
  if (k >= 75) return { color:'#1a6e2e', bg:'#e6f4ea' };
  if (k >= 50) return { color:'#8a5000', bg:'#fef7e0' };
  return { color:'#b31412', bg:'#fce8e6' };
};

const partStyle = (r) => {
  if (r >= 0.4) return { color:'#1a6e2e', bg:'#e6f4ea' };
  if (r >= 0.2) return { color:'#8a5000', bg:'#fef7e0' };
  return { color:'#b31412', bg:'#fce8e6' };
};

const bar = (pct, color) => {
  const w = Math.min(100, Math.round(pct));
  const r = 100 - w;
  return `<table cellpadding="0" cellspacing="0" width="100%" style="border-radius:3px;overflow:hidden;background:#e8eaed;margin-top:6px;">
    <tr>
      <td width="${w}%" style="background:${color};height:5px;font-size:1px;line-height:1px;">&nbsp;</td>
      ${r > 0 ? `<td width="${r}%" style="height:5px;font-size:1px;line-height:1px;">&nbsp;</td>` : ''}
    </tr>
  </table>`;
};

const scorecard = (label, big, bigColor, barPct, barColor, sub) => {
  return `<table cellpadding="0" cellspacing="0" width="100%" style="background:#f8f9fa;border-radius:6px;border:1px solid #e8eaed;">
    <tr><td style="padding:10px 12px;">
      <div style="font-size:10px;color:#9e9e9e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${label}</div>
      <div style="font-size:22px;font-weight:700;color:${bigColor};line-height:1.1;">${big}</div>
      ${barPct !== null ? bar(barPct, barColor) : ''}
      <div style="font-size:10px;color:#9e9e9e;margin-top:5px;">${sub}</div>
    </td></tr>
  </table>`;
};

export const buildHtml = (report, startDate, endDate) => {
  const date =  `${dayjs(startDate).format('dddd, MMMM D')} - ${dayjs(endDate).format('dddd, MMMM D')}`;
  const repos = Object.entries(report).filter(([k]) => k !== 'devs');
  const devs = report.devs || {};

  const repoRows = repos.map(([name, r]) => {
    const f = r.flow;
    const ct = f.cycleTime;
    const trend = ct.trend;
    const faster = trend.sign === '-';
    const trendLabel = faster ? '↓ ' + fmt(trend) + ' faster' : '↑ ' + fmt(trend) + ' slower';
    const trendColor = faster ? '#1a6e2e' : '#b31412';
    const waiting = f.waitingForReview.number;
    const culprits = f.waitingForReview.culprits || [];
    const repoUrl = r.url ? r.url.replace(/\.git$/, '') : '#';
    const mrLinks = culprits.map((u) =>
      `<a href="${u}" style="display:inline-block;color:#1a73e8;font-size:11px;text-decoration:none;margin-top:3px;">MR #${u.split('/').pop()}</a>`
    ).join('<br>');

    return `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid #e8eaed;">
        <a href="${repoUrl}" style="font-size:13px;font-weight:700;color:#1a73e8;text-decoration:none;">${name}</a>
      </td>
      ${statCell({ median: ct.weekly.median, p90: ct.weekly.p90, average: ct.weekly.average })}
      ${statCell({ median: ct.baseline90d.median, p90: ct.baseline90d.p90, average: ct.baseline90d.average })}
      <td style="padding:10px 14px;border-bottom:1px solid #e8eaed;text-align:center;font-size:13px;font-weight:700;color:${trendColor};white-space:nowrap;">${trendLabel}</td>
      ${statCell({ median: f.pickupTime.median, p90: f.pickupTime.p90, average: f.pickupTime.average })}
      ${statCell({ median: f.reviewTime.median, p90: f.reviewTime.p90, average: f.reviewTime.average })}
      <td style="padding:10px 14px;border-bottom:1px solid #e8eaed;text-align:center;">
        ${waiting > 0
          ? `<span style="background:#fce8e6;color:#b31412;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;">${waiting}</span><br>${mrLinks}`
          : `<span style="background:#e6f4ea;color:#1a6e2e;padding:3px 10px;border-radius:12px;font-size:12px;">None</span>`}
      </td>
    </tr>`;
  }).join('');

  const devCards = Object.entries(devs).map(([name, d]) => {
    const rev = d.review;
    const est = d.estimation;
    const m = est.devMetrics[0] || {};
    const kpi = m.kpi || 0;
    const ks = kpiStyle(kpi);
    const ps = partStyle(rev.participationRate || 0);
    const partPct = Math.round((rev.participationRate || 0) * 100);
    const tasks = est.taskDetails || [];

    const cards4 = `
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td width="25%" style="padding-right:8px;vertical-align:top;">
        ${scorecard('Estimation KPI', kpi + '%', ks.color, kpi, ks.color,
          `${m.total || 0} tasks · ${m.majorMisses || 0} major miss${(m.majorMisses || 0) !== 1 ? 'es' : ''}`)}
      </td>
      <td width="25%" style="padding-right:8px;vertical-align:top;">
        ${scorecard('Review participation', partPct + '%', ps.color, partPct, ps.color,
          `${rev.interacted} of ${rev.total} MRs`)}
      </td>
      <td width="25%" style="padding-right:8px;vertical-align:top;">
        <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8f9fa;border-radius:6px;border:1px solid #e8eaed;">
          <tr><td style="padding:10px 12px;">
            <div style="font-size:10px;color:#9e9e9e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Review time</div>
            <div style="font-size:22px;font-weight:700;color:#202124;line-height:1.1;">${fmt(rev.median)}</div>
            <div style="font-size:10px;color:#9e9e9e;margin-top:11px;">p90 ${fmt(rev.p90)} · avg ${fmt(rev.average)}</div>
          </td></tr>
        </table>
      </td>
      <td width="25%" style="vertical-align:top;">
        <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8f9fa;border-radius:6px;border:1px solid #e8eaed;">
          <tr><td style="padding:10px 12px;">
            <div style="font-size:10px;color:#9e9e9e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Avg deviation</div>
            <div style="font-size:22px;font-weight:700;color:#202124;line-height:1.1;">${(m.deviation?.avgDev || 0).toFixed(0)}%</div>
            <div style="font-size:10px;color:#9e9e9e;margin-top:11px;">median ${(m.deviation?.medianDev || 0).toFixed(0)}% · p90 ${(m.deviation?.p90Dev || 0).toFixed(0)}%</div>
          </td></tr>
        </table>
      </td>
    </tr></table>`;

    const taskRows = tasks.map((t) => {
      const s = sc(t.status);
      const url = `https://everymatrix.atlassian.net/browse/${t.key}`;
      return `<tr>
        <td style="padding:7px 10px;border-bottom:1px solid #f1f3f4;white-space:nowrap;">
          <a href="${url}" style="font-size:11px;color:#1a73e8;text-decoration:none;font-family:monospace;">${t.key}</a>
        </td>
        <td style="padding:7px 10px;border-bottom:1px solid #f1f3f4;font-size:12px;color:#202124;">${t.summary}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #f1f3f4;font-size:12px;color:#202124;text-align:center;white-space:nowrap;">${t.estimate}h</td>
        <td style="padding:7px 10px;border-bottom:1px solid #f1f3f4;font-size:12px;color:#202124;text-align:center;white-space:nowrap;">${parseFloat(t.actual).toFixed(1)}h</td>
        <td style="padding:7px 10px;border-bottom:1px solid #f1f3f4;font-size:12px;text-align:center;white-space:nowrap;">${t.deviation.toFixed(0)}%</td>
        <td style="padding:7px 10px;border-bottom:1px solid #f1f3f4;text-align:center;white-space:nowrap;">
          <span style="background:${s.bg};color:${s.fg};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${s.label}</span>
        </td>
      </tr>`;
    }).join('');

    return `<table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;border:1px solid #e8eaed;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e8eaed;">
        <span style="font-size:14px;font-weight:700;color:#202124;">${name}</span>
      </td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e8eaed;">${cards4}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:0;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <th style="padding:7px 10px;font-size:10px;color:#9e9e9e;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;">Key</th>
            <th style="padding:7px 10px;font-size:10px;color:#9e9e9e;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:0.5px;">Task</th>
            <th style="padding:7px 10px;font-size:10px;color:#9e9e9e;font-weight:600;text-align:center;text-transform:uppercase;letter-spacing:0.5px;">Est.</th>
            <th style="padding:7px 10px;font-size:10px;color:#9e9e9e;font-weight:600;text-align:center;text-transform:uppercase;letter-spacing:0.5px;">Actual</th>
            <th style="padding:7px 10px;font-size:10px;color:#9e9e9e;font-weight:600;text-align:center;text-transform:uppercase;letter-spacing:0.5px;">Dev.</th>
            <th style="padding:7px 10px;font-size:10px;color:#9e9e9e;font-weight:600;text-align:center;text-transform:uppercase;letter-spacing:0.5px;">Status</th>
          </tr>
          ${taskRows}
        </table>
      </td></tr>
    </table>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f3f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f4;padding:24px 0;">
<tr><td align="center">
<table width="720" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dadce0;">
  <tr style="background:#1a73e8;"><td style="padding:20px 28px;">
    <div style="font-size:18px;font-weight:700;color:#ffffff;">Team Flow Report</div>
    <div style="font-size:12px;color:#aecbfa;margin-top:3px;">${date}</div>
  </td></tr>
  <tr style="background:#f8f9fa;"><td style="padding:10px 28px;border-bottom:2px solid #e8eaed;">
    <span style="font-size:11px;font-weight:700;color:#5f6368;text-transform:uppercase;letter-spacing:0.8px;">Repository flow</span>
  </td></tr>
  <tr><td style="padding:20px 28px;">
    <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e8eaed;border-radius:8px;overflow:hidden;">
      <tr style="background:#f8f9fa;">
        <th style="padding:8px 14px;font-size:10px;font-weight:700;color:#9e9e9e;text-align:left;text-transform:uppercase;letter-spacing:0.5px;">Repo</th>
        <th style="padding:8px 14px;font-size:10px;font-weight:700;color:#9e9e9e;text-align:center;text-transform:uppercase;letter-spacing:0.5px;">Cycle time (week)</th>
        <th style="padding:8px 14px;font-size:10px;font-weight:700;color:#9e9e9e;text-align:center;text-transform:uppercase;letter-spacing:0.5px;">Cycle time (90d)</th>
        <th style="padding:8px 14px;font-size:10px;font-weight:700;color:#9e9e9e;text-align:center;text-transform:uppercase;letter-spacing:0.5px;">Trend</th>
        <th style="padding:8px 14px;font-size:10px;font-weight:700;color:#9e9e9e;text-align:center;text-transform:uppercase;letter-spacing:0.5px;">Pickup time (week)</th>
        <th style="padding:8px 14px;font-size:10px;font-weight:700;color:#9e9e9e;text-align:center;text-transform:uppercase;letter-spacing:0.5px;">Review time (week)</th>
        <th style="padding:8px 14px;font-size:10px;font-weight:700;color:#9e9e9e;text-align:center;text-transform:uppercase;letter-spacing:0.5px;">Awaiting</th>
      </tr>
      ${repoRows}
    </table>
  </td></tr>
  <tr style="background:#f8f9fa;"><td style="padding:10px 28px;border-top:1px solid #e8eaed;border-bottom:2px solid #e8eaed;">
    <span style="font-size:11px;font-weight:700;color:#5f6368;text-transform:uppercase;letter-spacing:0.8px;">Developer metrics</span>
  </td></tr>
  <tr><td style="padding:20px 28px 28px;">${devCards}</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
};


export const buildDevHtml = (report, devName, startDate, endDate) => {
  const date =  `${dayjs(startDate).format('dddd, MMMM D')} - ${dayjs(endDate).format('dddd, MMMM D')}`;

  const d = report.devs?.[devName];

  if (!d) {
    return `<html><body><h3>Developer "${devName}" not found</h3></body></html>`;
  }

  const rev = d.review;
  const est = d.estimation;
  const m = est.devMetrics[0] || {};
  const kpi = m.kpi || 0;

  const ks = kpiStyle(kpi);
  const ps = partStyle(rev.participationRate || 0);
  const partPct = Math.round((rev.participationRate || 0) * 100);
  const tasks = est.taskDetails || [];

  const cards4 = `
  <table cellpadding="0" cellspacing="0" width="100%"><tr>
    <td width="25%" style="padding-right:8px;vertical-align:top;">
      ${scorecard(
        'Estimation KPI',
        kpi + '%',
        ks.color,
        kpi,
        ks.color,
        `${m.total || 0} tasks · ${m.majorMisses || 0} major miss${(m.majorMisses || 0) !== 1 ? 'es' : ''}`
      )}
    </td>
    <td width="25%" style="padding-right:8px;vertical-align:top;">
      ${scorecard(
        'Review participation',
        partPct + '%',
        ps.color,
        partPct,
        ps.color,
        `${rev.interacted} of ${rev.total} MRs`
      )}
    </td>
    <td width="25%" style="padding-right:8px;vertical-align:top;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8f9fa;border-radius:6px;border:1px solid #e8eaed;">
        <tr><td style="padding:10px 12px;">
          <div style="font-size:10px;color:#9e9e9e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Review time</div>
          <div style="font-size:22px;font-weight:700;color:#202124;line-height:1.1;">${fmt(rev.median)}</div>
          <div style="font-size:10px;color:#9e9e9e;margin-top:11px;">p90 ${fmt(rev.p90)} · avg ${fmt(rev.average)}</div>
        </td></tr>
      </table>
    </td>
    <td width="25%" style="vertical-align:top;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8f9fa;border-radius:6px;border:1px solid #e8eaed;">
        <tr><td style="padding:10px 12px;">
          <div style="font-size:10px;color:#9e9e9e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Avg deviation</div>
          <div style="font-size:22px;font-weight:700;color:#202124;line-height:1.1;">${(m.deviation?.avgDev || 0).toFixed(0)}%</div>
          <div style="font-size:10px;color:#9e9e9e;margin-top:11px;">
            median ${(m.deviation?.medianDev || 0).toFixed(0)}% · 
            p90 ${(m.deviation?.p90Dev || 0).toFixed(0)}%
          </div>
        </td></tr>
      </table>
    </td>
  </tr></table>`;

  const taskRows = tasks.map((t) => {
    const s = sc(t.status);
    const url = `https://everymatrix.atlassian.net/browse/${t.key}`;
    return `<tr>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f3f4;white-space:nowrap;">
        <a href="${url}" style="font-size:11px;color:#1a73e8;text-decoration:none;font-family:monospace;">${t.key}</a>
      </td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f3f4;font-size:12px;color:#202124;">${t.summary}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f3f4;text-align:center;">${t.estimate}h</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f3f4;text-align:center;">${parseFloat(t.actual).toFixed(1)}h</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f3f4;text-align:center;">${t.deviation.toFixed(0)}%</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f3f4;text-align:center;">
        <span style="background:${s.bg};color:${s.fg};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${s.label}</span>
      </td>
    </tr>`;
  }).join('');

  const devCard = `
  <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;border:1px solid #e8eaed;border-radius:8px;overflow:hidden;">
    <tr><td style="padding:12px 16px;border-bottom:1px solid #e8eaed;">${cards4}</td></tr>
    <tr style="background:#f8f9fa;"><td style="padding:0;">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <th style="padding:7px 10px;font-size:10px;color:#9e9e9e;text-align:left;">Key</th>
          <th style="padding:7px 10px;font-size:10px;color:#9e9e9e;text-align:left;">Task</th>
          <th style="padding:7px 10px;font-size:10px;color:#9e9e9e;text-align:center;">Est.</th>
          <th style="padding:7px 10px;font-size:10px;color:#9e9e9e;text-align:center;">Actual</th>
          <th style="padding:7px 10px;font-size:10px;color:#9e9e9e;text-align:center;">Dev.</th>
          <th style="padding:7px 10px;font-size:10px;color:#9e9e9e;text-align:center;">Status</th>
        </tr>
        ${taskRows}
      </table>
    </td></tr>
  </table>`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f3f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f4;padding:24px 0;">
<tr><td align="center">
<table width="720" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dadce0;">
  
  <tr style="background:#1a73e8;"><td style="padding:20px 28px;">
    <div style="font-size:18px;font-weight:700;color:#ffffff;">Developer Report</div>
    <div style="font-size:12px;color:#aecbfa;margin-top:3px;">${date}</div>
  </td></tr>

  <tr style="background:#f8f9fa;">
    <td style="padding:10px 28px;border-bottom:2px solid #e8eaed;">
      <span style="font-size:11px;font-weight:700;color:#5f6368;text-transform:uppercase;">
        ${devName}
      </span>
    </td>
  </tr>

  <tr><td style="padding:20px 28px 28px;">
    ${devCard}
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
};