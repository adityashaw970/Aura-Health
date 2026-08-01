// UI Component Renderer & Canvas Chart Utilities for AuraHealth

export class UiRenderer {
  /**
   * Renders Canvas Chart for Calorie Intake vs Weight Trend.
   * Guards against zero-dimension containers (hidden tabs).
   */
  static renderCalorieWeightChart(canvasId, logs, targetCalories) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Guard: getBoundingClientRect returns 0 when tab is hidden — use offsetWidth fallback
    const rawW = canvas.parentElement ? canvas.parentElement.offsetWidth : canvas.offsetWidth;
    const rawH = 260;

    if (rawW === 0) return; // Not visible yet; will render when tab opens

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rawW * dpr;
    canvas.height = rawH * dpr;
    canvas.style.width = rawW + 'px';
    canvas.style.height = rawH + 'px';
    ctx.scale(dpr, dpr);

    const width = rawW;
    const height = rawH;

    ctx.clearRect(0, 0, width, height);

    if (!logs || logs.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = `13px ${getComputedStyle(document.documentElement).getPropertyValue('--font-main') || 'sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.fillText('No historical log data available. Load a dataset to view charts.', width / 2, height / 2);
      return;
    }

    const chronological = [...logs]; // Already sorted ascending from the engine
    const paddingLeft = 48;
    const paddingRight = 50;
    const paddingTop = 28;
    const paddingBottom = 38;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    // Scale axes
    const caloriesList = chronological.map(l => (l.meals ? l.meals.calories : 0)).filter(c => c > 0);
    const weightsList = chronological.map(l => l.weightKg).filter(w => w && w > 0);

    if (caloriesList.length === 0 && weightsList.length === 0) return;

    const minCal = Math.min(1200, ...(caloriesList.length ? caloriesList : [targetCalories]), targetCalories - 300);
    const maxCal = Math.max(3000, ...(caloriesList.length ? caloriesList : [targetCalories]), targetCalories + 300);

    const minW = weightsList.length > 0 ? Math.min(...weightsList) - 1.5 : 60;
    const maxW = weightsList.length > 0 ? Math.max(...weightsList) + 1.5 : 80;

    const stepX = chartW / Math.max(1, chronological.length - 1);

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const gy = paddingTop + (chartH / 4) * g;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, gy);
      ctx.lineTo(width - paddingRight, gy);
      ctx.stroke();
    }

    // 1. Draw Target Calorie Line (Dashed)
    const targetY = paddingTop + chartH - ((targetCalories - minCal) / (maxCal - minCal)) * chartH;
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.moveTo(paddingLeft, targetY);
    ctx.lineTo(width - paddingRight, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(99, 102, 241, 0.85)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${targetCalories} kcal target`, width - paddingRight - 2, targetY - 4);

    // 2. Draw Calorie Bars
    const barWidth = Math.max(5, Math.min(20, stepX * 0.5));
    chronological.forEach((log, idx) => {
      const x = paddingLeft + idx * stepX;
      const cal = log.meals ? log.meals.calories : 0;
      if (cal > 0) {
        const barH = ((cal - minCal) / (maxCal - minCal)) * chartH;
        const y = paddingTop + chartH - barH;

        ctx.fillStyle = cal > targetCalories + 300 ? 'rgba(244, 63, 94, 0.35)' : 'rgba(6, 182, 212, 0.3)';
        ctx.fillRect(x - barWidth / 2, y, barWidth, barH);

        ctx.strokeStyle = cal > targetCalories + 300 ? 'rgba(244, 63, 94, 0.7)' : 'rgba(6, 182, 212, 0.7)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - barWidth / 2, y, barWidth, barH);
      }

      // X-Axis Date Labels (show ~6 evenly spaced)
      const showEvery = Math.ceil(chronological.length / 6);
      if (idx % showEvery === 0 || idx === chronological.length - 1) {
        const dStr = log.date.split('-').slice(1).join('/');
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(dStr, x, height - 8);
      }
    });

    // 3. Draw Weight Trend Line (Emerald)
    if (weightsList.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      let firstPoint = true;

      chronological.forEach((log, idx) => {
        if (log.weightKg && log.weightKg > 0) {
          const x = paddingLeft + idx * stepX;
          const y = paddingTop + chartH - ((log.weightKg - minW) / (maxW - minW)) * chartH;
          if (firstPoint) { ctx.moveTo(x, y); firstPoint = false; }
          else { ctx.lineTo(x, y); }
        }
      });
      ctx.stroke();

      // Weight Dots
      chronological.forEach((log, idx) => {
        if (log.weightKg && log.weightKg > 0) {
          const x = paddingLeft + idx * stepX;
          const y = paddingTop + chartH - ((log.weightKg - minW) / (maxW - minW)) * chartH;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#10b981';
          ctx.fill();
          ctx.strokeStyle = '#0b0f19';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    }

    // Y-Axis Calorie Labels (left)
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    const calSteps = [minCal, (minCal + maxCal) / 2, maxCal];
    calSteps.forEach(v => {
      const y = paddingTop + chartH - ((v - minCal) / (maxCal - minCal)) * chartH;
      ctx.fillText(Math.round(v) + ' cal', paddingLeft - 4, y + 3);
    });
  }

  /**
   * Renders Canvas Chart for Sleep vs Mood Score Correlation.
   * Guards against zero-dimension containers.
   */
  static renderSleepMoodChart(canvasId, logs) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const rawW = canvas.parentElement ? canvas.parentElement.offsetWidth : canvas.offsetWidth;
    const rawH = 260;

    if (rawW === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rawW * dpr;
    canvas.height = rawH * dpr;
    canvas.style.width = rawW + 'px';
    canvas.style.height = rawH + 'px';
    ctx.scale(dpr, dpr);

    const width = rawW;
    const height = rawH;

    ctx.clearRect(0, 0, width, height);

    if (!logs || logs.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', width / 2, height / 2);
      return;
    }

    const chronological = [...logs];
    const paddingLeft = 38;
    const paddingRight = 20;
    const paddingTop = 28;
    const paddingBottom = 30;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;
    const stepX = chartW / Math.max(1, chronological.length - 1);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const gy = paddingTop + (chartH / 4) * g;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, gy);
      ctx.lineTo(width - paddingRight, gy);
      ctx.stroke();
    }

    // Sleep line area fill (subtle)
    ctx.beginPath();
    let sleepFirst = true;
    chronological.forEach((log, idx) => {
      if (log.sleepHours != null && log.sleepHours > 0) {
        const x = paddingLeft + idx * stepX;
        const y = paddingTop + chartH - (Math.min(log.sleepHours, 12) / 12) * chartH;
        if (sleepFirst) { ctx.moveTo(x, y); sleepFirst = false; }
        else { ctx.lineTo(x, y); }
      }
    });
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Mood line (Amber dashed)
    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.lineJoin = 'round';
    let moodFirst = true;
    chronological.forEach((log, idx) => {
      if (log.moodScore != null) {
        const x = paddingLeft + idx * stepX;
        const y = paddingTop + chartH - (log.moodScore / 10) * chartH;
        if (moodFirst) { ctx.moveTo(x, y); moodFirst = false; }
        else { ctx.lineTo(x, y); }
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend
    const legendY = paddingTop - 8;
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(paddingLeft, legendY - 7, 14, 3);
    ctx.fillStyle = '#a78bfa';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Sleep (hrs)', paddingLeft + 18, legendY);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(paddingLeft + 100, legendY - 7, 14, 3);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('Mood (1-10)', paddingLeft + 118, legendY);
  }
}
