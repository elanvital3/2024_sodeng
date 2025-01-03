import React, { useState, useEffect } from 'react'
import { db } from '../../services/firebase'
import { collection, getDocs } from 'firebase/firestore'
import './FinancialPage.css'

function FinancialPage() {
  const [salesData, setSalesData] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  )
  const [selectedBranch, setSelectedBranch] = useState('Branch 1') // Default branch

  useEffect(() => {
    fetchSalesData(selectedMonth, selectedBranch)
  }, [selectedMonth, selectedBranch])

  const fetchSalesData = async (month, branch) => {
    try {
      const salesSnapshot = await getDocs(
        collection(db, 'branches', branch, 'sales')
      )
      const monthSales = salesSnapshot.docs
        .filter((doc) => doc.id.startsWith(month))
        .map((salesDoc) => ({
          ...salesDoc.data(),
          date: salesDoc.id,
        }))
      setSalesData(monthSales)
    } catch (error) {
      console.error('Error fetching sales data:', error)
    }
  }

  const getDatesInMonth = (month) => {
    const [year, monthNum] = month.split('-')
    const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate()
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(Date.UTC(year, monthNum - 1, i + 1))
      const day = date.toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'UTC',
      })
      const dayNum = date.getUTCDate()
      const isSaturday = day === 'Sat'
      return {
        dateStr: `${String(monthNum).padStart(2, '0')}-${String(
          dayNum
        ).padStart(2, '0')} (${day})`,
        isSaturday,
        dayOfWeek: day,
        date,
      }
    }).filter(({ dayOfWeek }) => dayOfWeek !== 'Sun')
  }

  const datesInMonth = getDatesInMonth(selectedMonth)

  const monthlyTotalSales = salesData.reduce(
    (sum, entry) => sum + Number(entry.dailySales || 0),
    0
  )
  const monthlyNominalPayroll = salesData.reduce(
    (sum, entry) => sum + Number(entry.nominalPayroll || 0),
    0
  )
  const monthlyActualPayroll = salesData.reduce(
    (sum, entry) => sum + Number(entry.actualPayroll || 0),
    0
  )

  return (
    <div className="container mt-5">
      <h3 className="text-center">Monthly Financial Report</h3>

      <div className="row justify-content-center mb-3">
        <div className="col-md-3">
          <input
            type="month"
            className="form-control"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <select
            className="form-control"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="Branch 1">Branch 1</option>
            <option value="Branch 2">Branch 2</option>
            {/* <option value="Branch 3">Branch 3</option> */}
          </select>
        </div>
      </div>

      {/* Monthly Summary Table */}
      <table className="table table-bordered mb-4">
        <thead>
          <tr>
            <th>Month</th>
            <th>Sales</th>
            <th>NOM Wage</th>
            <th>ACT Wage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{selectedMonth}</td>
            <td>
              {monthlyTotalSales ? `${monthlyTotalSales.toFixed(0)} $` : '-'}
            </td>
            <td>
              {monthlyNominalPayroll
                ? `${monthlyNominalPayroll.toFixed(0)} $ (${(
                    (monthlyNominalPayroll / monthlyTotalSales) *
                    100
                  ).toFixed(1)}%)`
                : '-'}
            </td>
            <td>
              {monthlyActualPayroll
                ? `${monthlyActualPayroll.toFixed(0)} $ (${(
                    (monthlyActualPayroll / monthlyTotalSales) *
                    100
                  ).toFixed(1)}%)`
                : '-'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Daily Details Table */}
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>Date</th>
            <th>Sales</th>
            <th>NOM Wage</th>
            <th>ACT Wage</th>
          </tr>
        </thead>
        <tbody>
          {datesInMonth.map(({ date, dateStr, isSaturday }, idx) => {
            const salesDataForDate = salesData.find(
              (s) => s.date === date.toISOString().split('T')[0]
            )

            const dailySales = salesDataForDate?.dailySales || 0
            const dailySalesDisplay = dailySales
              ? `${dailySales.toFixed(0)} $`
              : '-'

            const nominalPayroll = salesDataForDate?.nominalPayroll || 0
            const nominalPayrollDisplay = nominalPayroll
              ? `${Number(nominalPayroll).toFixed(0)} $ (${(
                  (nominalPayroll / dailySales) *
                  100
                ).toFixed(1)}%)`
              : '-'

            const actualPayroll = salesDataForDate?.actualPayroll || 0
            const actualPayrollDisplay = actualPayroll
              ? `${Number(actualPayroll).toFixed(0)} $ (${(
                  (actualPayroll / dailySales) *
                  100
                ).toFixed(1)}%)`
              : '-'

            return (
              <tr key={idx}>
                <td style={{ color: isSaturday ? 'blue' : 'black' }}>
                  {dateStr}
                </td>
                <td>{dailySalesDisplay}</td>
                <td>{nominalPayrollDisplay}</td>
                <td>{actualPayrollDisplay}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default FinancialPage
