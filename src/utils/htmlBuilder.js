export const buildHtml = (data) => {

  const formatTime = (t) => {
    if (!t) return '—';
    return `${t.days ? `${t.days}d ` : ''}${t.hours}h ${t.mins}m`;
  };

  const formatTrend = (trend) => {
    const val = formatTime(trend);
    return trend.sign === '-'
      ? `<span style="color:#2e7d32;">↓ -${val} vs 90d baseline</span>`
      : `<span style="color:#c62828;">↑ +${val} vs 90d baseline</span>`;
  };

  const renderWaiting = ({ number, culprits }) => {
    if (!number) return '0';

    if (number <= 3) {
      return `
        <b style="color:#c62828;">${number}</b><br/>
        ${culprits.map((url, i) => `<a href="${url}">MR ${i + 1} →</a>`).join('<br/>')}
      `;
    }

    return `<b style="color:#c62828;">${number}</b>`;
  };

  const renderFlow = () => {
    return Object.entries(data)
      .filter(([k]) => k !== 'devs')
      .map(([name, repo]) => {

        const { flow, url } = repo;

        return `
        <tr>
          <td style="border:1px solid #ddd; padding:12px;">
            <b><a href="${url}">${name}</a></b><br/><br/>

            Cycle Time (CR): <b>${formatTime(flow.cycleTime.weekly)}</b>
            ${formatTrend(flow.cycleTime.trend)}<br/>

            Baseline (90d): ${formatTime(flow.cycleTime.baseline90d)}<br/><br/>

            Pickup Time: ${formatTime(flow.pickupTime)}<br/>
            Review Time: ${formatTime(flow.reviewTime)}<br/><br/>

            Waiting for Review:<br/>
            ${renderWaiting(flow.waitingForReview)}
          </td>
        </tr>`;
      })
      .join('');
  };

  const renderReview = () => {
    return Object.entries(data.devs)
      .map(([name, dev]) => {
        const r = dev.review;

        return `
        <tr>
          <td style="border:1px solid #ddd; padding:6px;">${name}</td>
          <td style="border:1px solid #ddd; padding:6px;">
            ${r.interacted} / ${r.total}
          </td>
          <td style="border:1px solid #ddd; padding:6px;">
            ${(r.participationRate * 100).toFixed(0)}%
          </td>
          <td style="border:1px solid #ddd; padding:6px;">
            ${formatTime(r.average)}
          </td>
        </tr>`;
      })
      .join('');
  };

  const renderEstimationSummary = () => {
    return Object.entries(data.devs)
      .map(([name, dev]) => {

        const m = dev.estimation.devMetrics?.[0];
        if (!m) return '';

        const color =
          m.kpi >= 80 ? '#2e7d32' :
          m.kpi >= 50 ? '#f9a825' :
          '#c62828';

        return `
        <tr>
          <td style="border:1px solid #ddd; padding:6px;">${name}</td>
          <td style="border:1px solid #ddd; padding:6px; color:${color};">${m.kpi}</td>
          <td style="border:1px solid #ddd; padding:6px;">${m.majorMisses}</td>
          <td style="border:1px solid #ddd; padding:6px;">${m.avgDeviation}%</td>
        </tr>`;
      })
      .join('');
  };

  const renderEstimationDetails = () => {
    return Object.entries(data.devs)
      .map(([name, dev]) => {

        const m = dev.estimation.devMetrics?.[0];
        const tasks = dev.estimation.taskDetails || [];

        if (!m || !tasks.length) return '';

        const rows = tasks.map(t => {
          const color =
            t.status === 'OK' ? '#2e7d32' :
            t.status === 'MINOR_MISS' ? '#f9a825' :
            '#c62828';

          return `
          <tr>
            <td style="border:1px solid #ddd; padding:6px;">
              <a href="https://everymatrix.atlassian.net/browse/${t.key}">
                ${t.key}
              </a><br/>
              ${t.summary}
            </td>
            <td style="border:1px solid #ddd; padding:6px;">${t.estimate}</td>
            <td style="border:1px solid #ddd; padding:6px;">${t.actual.toFixed(2)}</td>
            <td style="border:1px solid #ddd; padding:6px;">${t.deviation}%</td>
            <td style="border:1px solid #ddd; padding:6px; color:${color};">
              ${t.status}
            </td>
          </tr>`;
        }).join('');

        return `
        <b>${name}</b><br/>
        KPI: ${m.kpi} | Tasks: ${m.total} | Major: ${m.majorMisses} | Avg Dev: ${m.avgDeviation}%<br/><br/>

        <table style="width:100%; border-collapse: collapse; margin-bottom:25px;">
          <tr style="background:#f5f5f5;">
            <th style="border:1px solid #ddd; padding:6px;">Task</th>
            <th style="border:1px solid #ddd; padding:6px;">Est</th>
            <th style="border:1px solid #ddd; padding:6px;">Act</th>
            <th style="border:1px solid #ddd; padding:6px;">Deviation</th>
            <th style="border:1px solid #ddd; padding:6px;">Status</th>
          </tr>
          ${rows}
        </table>`;
      })
      .join('');
  };

  return `
  <html>
    <body style="font-family: Arial, sans-serif; font-size:14px; color:#222;">

      <h2>Dev Health Snapshot</h2>

      <h3>📊 Code Review Flow (Weekly)</h3>
      <table style="width:100%; border-collapse: collapse; margin-bottom:20px;">
        ${renderFlow()}
      </table>

      <h3>👥 Review Performance (Weekly)</h3>
      <table style="width:100%; border-collapse: collapse; margin-bottom:20px;">
        <tr style="background:#f5f5f5;">
          <th style="border:1px solid #ddd; padding:6px;">Developer</th>
          <th style="border:1px solid #ddd; padding:6px;">Reviews</th>
          <th style="border:1px solid #ddd; padding:6px;">Participation</th>
          <th style="border:1px solid #ddd; padding:6px;">Pickup Time</th>
        </tr>
        ${renderReview()}
      </table>

      <h3>🎯 Estimation Performance (Summary)</h3>
      <table style="width:100%; border-collapse: collapse; margin-bottom:20px;">
        <tr style="background:#f5f5f5;">
          <th style="border:1px solid #ddd; padding:6px;">Developer</th>
          <th style="border:1px solid #ddd; padding:6px;">KPI</th>
          <th style="border:1px solid #ddd; padding:6px;">Major</th>
          <th style="border:1px solid #ddd; padding:6px;">Avg Dev</th>
        </tr>
        ${renderEstimationSummary()}
      </table>

      <h3>📌 Estimation Details (All Tasks)</h3>
      ${renderEstimationDetails()}

    </body>
  </html>
  `;
};



export const buildDevHtml = (data, devName) => {

  const dev = data.devs?.[devName];
  if (!dev) return `<p>No data for ${devName}</p>`;

  const formatTime = (t) => {
    if (!t) return '—';
    return `${t.days ? `${t.days}d ` : ''}${t.hours}h ${t.mins}m`;
  };

  const formatTrend = (trend) => {
    const val = formatTime(trend);
    return trend.sign === '-'
      ? `<span style="color:#2e7d32;">↓ -${val}</span>`
      : `<span style="color:#c62828;">↑ +${val}</span>`;
  };

  const renderWaiting = ({ number, culprits }) => {
    if (!number) return '0';

    if (number <= 3) {
      return culprits.map((url, i) =>
        `<a href="${url}">MR ${i + 1}</a>`
      ).join('<br/>');
    }

    return `<b>${number} MRs</b>`;
  };

  // 👉 Filter repos where dev is active
  const renderFlow = () => {
    return Object.entries(data)
      .filter(([k]) => k !== 'devs')
      .filter(([_, repo]) =>
        dev.review.repos.includes(repo?.flow ? repo.flow.projectId : undefined) ||
        true // fallback (we don’t have projectId in your structure → keep all for now)
      )
      .map(([name, repo]) => {

        const { flow, url } = repo;

        return `
        <tr>
          <td style="border:1px solid #ddd; padding:12px;">
            <b><a href="${url}">${name}</a></b><br/><br/>

            Cycle Time (CR): <b>${formatTime(flow.cycleTime.weekly)}</b>
            ${formatTrend(flow.cycleTime.trend)}<br/>

            Baseline (90d): ${formatTime(flow.cycleTime.baseline90d)}<br/><br/>

            Pickup Time: ${formatTime(flow.pickupTime)}<br/>
            Review Time: ${formatTime(flow.reviewTime)}<br/><br/>

            Waiting for Review:<br/>
            ${renderWaiting(flow.waitingForReview)}
          </td>
        </tr>`;
      })
      .join('');
  };

  const renderReview = () => {
    const r = dev.review;

    return `
    <tr>
      <td style="border:1px solid #ddd; padding:6px;">${devName}</td>
      <td style="border:1px solid #ddd; padding:6px;">
        ${r.interacted} / ${r.total}
      </td>
      <td style="border:1px solid #ddd; padding:6px;">
        ${(r.participationRate * 100).toFixed(0)}%
      </td>
      <td style="border:1px solid #ddd; padding:6px;">
        ${formatTime(r.average)}
      </td>
    </tr>`;
  };

  const renderEstimationSummary = () => {
    const m = dev.estimation.devMetrics?.[0];
    if (!m) return '';

    const color =
      m.kpi >= 80 ? '#2e7d32' :
      m.kpi >= 50 ? '#f9a825' :
      '#c62828';

    return `
    <tr>
      <td style="border:1px solid #ddd; padding:6px;">${devName}</td>
      <td style="border:1px solid #ddd; padding:6px; color:${color};">${m.kpi}</td>
      <td style="border:1px solid #ddd; padding:6px;">${m.majorMisses}</td>
      <td style="border:1px solid #ddd; padding:6px;">${m.avgDeviation}%</td>
    </tr>`;
  };

  const renderEstimationDetails = () => {
    const m = dev.estimation.devMetrics?.[0];
    const tasks = dev.estimation.taskDetails || [];

    if (!m || !tasks.length) return `<p>No estimation data</p>`;

    const rows = tasks.map(t => {

      const color =
        t.status === 'OK' ? '#2e7d32' :
        t.status === 'MINOR_MISS' ? '#f9a825' :
        '#c62828';

      return `
      <tr>
        <td style="border:1px solid #ddd; padding:6px;">
          <a href="https://everymatrix.atlassian.net/browse/${t.key}">
            ${t.key}
          </a><br/>
          ${t.summary}
        </td>
        <td style="border:1px solid #ddd; padding:6px;">${t.estimate}</td>
        <td style="border:1px solid #ddd; padding:6px;">${t.actual.toFixed(2)}</td>
        <td style="border:1px solid #ddd; padding:6px;">${t.deviation}%</td>
        <td style="border:1px solid #ddd; padding:6px; color:${color};">
          ${t.status}
        </td>
      </tr>`;
    }).join('');

    return `
      KPI: ${m.kpi} | Tasks: ${m.total} | Major: ${m.majorMisses} | Avg Dev: ${m.avgDeviation}%<br/><br/>

      <table style="width:100%; border-collapse: collapse; margin-bottom:25px;">
        <tr style="background:#f5f5f5;">
          <th style="border:1px solid #ddd; padding:6px;">Task</th>
          <th style="border:1px solid #ddd; padding:6px;">Est</th>
          <th style="border:1px solid #ddd; padding:6px;">Act</th>
          <th style="border:1px solid #ddd; padding:6px;">Deviation</th>
          <th style="border:1px solid #ddd; padding:6px;">Status</th>
        </tr>
        ${rows}
      </table>
    `;
  };

  return `
  <html>
    <body style="font-family: Arial, sans-serif; font-size:14px; color:#222;">

      <h2>Dev Health — ${devName}</h2>

      <h3>📊 Code Review Flow</h3>
      <table style="width:100%; border-collapse: collapse; margin-bottom:20px;">
        ${renderFlow()}
      </table>

      <h3>👥 Your Review Performance</h3>
      <table style="width:100%; border-collapse: collapse; margin-bottom:20px;">
        <tr style="background:#f5f5f5;">
          <th style="border:1px solid #ddd; padding:6px;">Developer</th>
          <th style="border:1px solid #ddd; padding:6px;">Reviews</th>
          <th style="border:1px solid #ddd; padding:6px;">Participation</th>
          <th style="border:1px solid #ddd; padding:6px;">Pickup Time</th>
        </tr>
        ${renderReview()}
      </table>

      <h3>🎯 Your Estimation Performance</h3>
      <table style="width:100%; border-collapse: collapse; margin-bottom:20px;">
        <tr style="background:#f5f5f5;">
          <th style="border:1px solid #ddd; padding:6px;">Developer</th>
          <th style="border:1px solid #ddd; padding:6px;">KPI</th>
          <th style="border:1px solid #ddd; padding:6px;">Major</th>
          <th style="border:1px solid #ddd; padding:6px;">Avg Dev</th>
        </tr>
        ${renderEstimationSummary()}
      </table>

      <h3>📌 Your Task Breakdown</h3>
      ${renderEstimationDetails()}

    </body>
  </html>
  `;
};