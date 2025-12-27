export const styles = `
<style>
    body { font-family: 'Arial', sans-serif; font-size: 12px; line-height: 1.4; color: #333; }
    h1, h2, h3 { text-align: center; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #333; padding: 4px 8px; text-align: left; }
    th { background-color: #f0f0f0; }
    .header { margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .footer { margin-top: 30px; display: flex; justify-content: space-between; }
    .sig-block { width: 200px; border-top: 1px solid #333; padding-top: 5px; text-align: center; margin-top: 50px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
</style>
`;
export function attendanceSummary(data) {
    const { company, project, period, rows } = data;
    return `
    <html>
    <head>
        <title>Attendance Summary</title>
        ${styles}
    </head>
    <body>
        <div class="header">
            <h2>${company.name}</h2>
            <div class="text-center">Work Order: ${project.work_order_no} | ${project.client_name} - ${project.site_name}</div>
            <div class="text-center">Attendance Period: ${period.from_date} to ${period.to_date}</div>
        </div>

        <h3>Attendance Summary</h3>

        <table>
            <thead>
                <tr>
                    <th>S.No</th>
                    <th>Name</th>
                    <th>Skill</th>
                    <th>UAN</th>
                    <th class="text-right">Days Worked</th>
                    <th class="text-right">Daily Wage</th>
                    <th class="text-right">Total Wage</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map((row, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${row.name}</td>
                    <td>${row.skill_type}</td>
                    <td>${row.uan || '-'}</td>
                    <td class="text-right">${row.days_worked}</td>
                    <td class="text-right">${row.daily_wage}</td>
                    <td class="text-right">${row.wage_amount}</td>
                </tr>
                `).join('')}
                <tr>
                    <td colspan="6" class="text-right"><strong>Total</strong></td>
                    <td class="text-right"><strong>${rows.reduce((sum, r) => sum + r.wage_amount, 0)}</strong></td>
                </tr>
            </tbody>
        </table>

        <div class="footer">
            <div class="sig-block">Site Engineer</div>
            <div class="sig-block">Project Manager</div>
        </div>
    </body>
    </html>
    `;
}
// Add simple placeholders for others for now
export function wageDeclaration(data) {
    const { company, project, period, rows } = data;
    return `
    <html>
    <head><title>Wage Declaration</title>${styles}</head>
    <body>
        <div class="header">
             <h2>${company.name}</h2>
             <h3>Wage Disbursement Declaration</h3>
             <div class="text-center">Period: ${period.from_date} to ${period.to_date}</div>
        </div>
        <p>I hereby declare that wages for the above period have been disbursed to the following employees:</p>
        
        <table>
            <thead>
                <tr>
                    <th>Emp ID</th>
                    <th>Name</th>
                    <th>Bank/Cash</th>
                    <th class="text-right">Net Amount</th>
                    <th>Signature</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map((row) => `
                <tr>
                    <td>${row.id}</td>
                    <td>${row.name}</td>
                    <td>Bank Transfer</td>
                    <td class="text-right">${row.wage_amount}</td>
                    <td></td>
                </tr>
                `).join('')}
            </tbody>
        </table>
         <div class="footer">
            <div class="sig-block">Authorized Signatory</div>
        </div>
    </body>
    </html>
    `;
}
