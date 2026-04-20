import { Fragment, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  createBillingCheckoutSession,
  getBills,
  verifyBillingCheckoutSession,
} from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useAdminBuildingFilter } from '../hooks/useAdminBuildingFilter'
import { downloadBillPdf } from '../utils/receiptPdf'
import type { Bill } from '../types'

function formatPaidDate(b: Bill): string {
  if (!b.paidAt) return '—'
  const d = new Date(b.paidAt)
  return Number.isNaN(d.getTime()) ? b.paidAt : d.toLocaleString()
}

type BillDetailKind = 'invoice' | 'receipt'

function BillDetailPanel({
  bill,
  kind,
  residentName,
}: {
  bill: Bill
  kind: BillDetailKind
  residentName?: string
}) {
  const footnote =
    kind === 'invoice'
      ? 'This is not a tax invoice unless separately issued by your jurisdiction.'
      : 'This document is a record of payment for your records.'

  return (
    <div
      className="bill-detail-panel"
      role="region"
      aria-label={kind === 'invoice' ? 'Full bill details' : 'Payment receipt details'}
    >
      <p className="bill-detail-kicker muted small">
        Property Manager · {kind === 'invoice' ? 'Bill / statement' : 'Payment receipt'}
      </p>
      <h4 className="bill-detail-title">{kind === 'invoice' ? 'Invoice' : 'Receipt'}</h4>
      <dl className="bill-detail-dl">
        <dt>Bill ID</dt>
        <dd>{bill.billId}</dd>
        <dt>Description</dt>
        <dd>{bill.type}</dd>
        <dt>Amount</dt>
        <dd>${bill.amount.toFixed(2)}</dd>
        <dt>Due date</dt>
        <dd>{bill.dueDate}</dd>
        {kind === 'invoice' ? (
          <>
            <dt>Status</dt>
            <dd>{bill.status}</dd>
          </>
        ) : (
          <>
            <dt>Paid date</dt>
            <dd>{formatPaidDate(bill)}</dd>
            <dt>Payment method</dt>
            <dd>{bill.paymentMethod?.trim() || '—'}</dd>
          </>
        )}
        {residentName ? (
          <>
            <dt>Resident</dt>
            <dd>{residentName}</dd>
          </>
        ) : null}
      </dl>
      <p className="bill-detail-footnote muted small">{footnote}</p>
      <p className="bill-detail-generated muted small">Generated {new Date().toLocaleString()}</p>
    </div>
  )
}

export function BillingPaymentsPage() {
  const { auth } = useAuth()
  const showToast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const scopedBills = useAdminBuildingFilter(bills)
  const [payingBillId, setPayingBillId] = useState<string | null>(null)
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null)

  useEffect(() => {
    if (!auth?.token) return
    getBills(auth.token)
      .then(setBills)
      .catch(() => {
        showToast('Could not load bills.', 'error')
      })
      .finally(() => setLoading(false))
  }, [auth?.token, showToast])

  const queryString = searchParams.toString()

  useEffect(() => {
    if (!auth?.token) return
    const params = new URLSearchParams(queryString)
    const sessionId = params.get('session_id')
    const canceled = params.get('canceled')
    if (canceled === '1') {
      showToast('Payment was canceled.', 'info')
      setSearchParams({}, { replace: true })
      return
    }
    if (!sessionId) return

    let cancelled = false
    ;(async () => {
      try {
        await verifyBillingCheckoutSession(auth.token, sessionId)
        if (cancelled) return
        setSearchParams({}, { replace: true })
        const list = await getBills(auth.token)
        if (!cancelled) {
          setBills(list)
          showToast('Payment successful.', 'success')
        }
      } catch {
        if (!cancelled) {
          showToast(
            'Could not confirm payment. If you were charged, refresh the page or contact support.',
            'error',
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [auth?.token, queryString, setSearchParams, showToast])

  const unpaidBills = scopedBills.filter((b) => b.status.toLowerCase() !== 'paid')

  const paidBills = useMemo(() => {
    const paid = scopedBills.filter((b) => b.status.toLowerCase() === 'paid')
    return [...paid].sort((a, b) => {
      const ta = a.paidAt ? new Date(a.paidAt).getTime() : 0
      const tb = b.paidAt ? new Date(b.paidAt).getTime() : 0
      return tb - ta
    })
  }, [scopedBills])

  async function handlePay(billId: string) {
    if (!auth?.token) return
    setPayingBillId(billId)
    try {
      const { url } = await createBillingCheckoutSession(auth.token, billId)
      window.location.assign(url)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start payment'
      showToast(msg, 'error')
      setPayingBillId(null)
    }
  }

  function handleDownloadPdf(b: Bill, kind: 'invoice' | 'receipt') {
    try {
      downloadBillPdf(b, { kind, residentName: auth?.name })
      showToast(kind === 'invoice' ? 'Invoice PDF saved.' : 'Receipt PDF saved.', 'success')
    } catch {
      showToast('Could not generate PDF.', 'error')
    }
  }

  function toggleBillDetail(billId: string) {
    setExpandedBillId((prev) => (prev === billId ? null : billId))
  }

  return (
    <div className="page billing-payments-page">
      <h1>Billing & Payments</h1>
      <section className="card">
        <h3 className="card-title">Current Bills</h3>
        {loading ? (
          <p className="muted">Loading...</p>
        ) : unpaidBills.length === 0 ? (
          <p className="muted">No outstanding bills</p>
        ) : (
          <ul className="bill-list bill-list-current">
            {unpaidBills.map((b) => {
              const open = expandedBillId === b.billId
              return (
                <li key={b.billId} className="bill-item bill-item-with-detail">
                  <div className="bill-item-top">
                    <div className="bill-item-main">
                      <div className="bill-item-heading">
                        <strong className="bill-item-id">{b.billId}</strong>
                        <span className={`status-pill ${b.status.toLowerCase()}`}>{b.status}</span>
                      </div>
                      <p className="bill-item-type">{b.type}</p>
                      {b.type === 'Monthly Service Charge' && (
                        <p className="muted bill-item-desc">Building maintenance, security, cleaning services</p>
                      )}
                      <p className="bill-item-due">Due: {b.dueDate}</p>
                    </div>
                    <div className="bill-item-aside">
                      <span className="bill-item-amount">${b.amount.toFixed(2)}</span>
                      <div className="bill-item-actions">
                        <button
                          type="button"
                          className="bill-btn bill-btn--outline"
                          aria-expanded={open}
                          onClick={() => toggleBillDetail(b.billId)}
                        >
                          {open ? 'Hide details' : 'Show details'}
                        </button>
                        <button
                          type="button"
                          className="bill-btn bill-btn--outline"
                          onClick={() => handleDownloadPdf(b, 'invoice')}
                        >
                          Download PDF
                        </button>
                        <button
                          type="button"
                          className="bill-btn bill-btn--pay"
                          disabled={payingBillId !== null}
                          onClick={() => void handlePay(b.billId)}
                        >
                          {payingBillId === b.billId ? 'Redirecting…' : 'Pay now'}
                        </button>
                      </div>
                    </div>
                  </div>
                  {open ? (
                    <BillDetailPanel bill={b} kind="invoice" residentName={auth?.name} />
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="card">
        <h3 className="card-title">Payment history</h3>
        {loading ? (
          <p className="muted">Loading...</p>
        ) : paidBills.length === 0 ? (
          <p className="muted">No paid bills yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bill ID</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Paid date</th>
                  <th>Payment method</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paidBills.map((b) => {
                  const open = expandedBillId === b.billId
                  return (
                    <Fragment key={b.billId}>
                      <tr>
                        <td>{b.billId}</td>
                        <td>{b.type}</td>
                        <td>${b.amount.toFixed(2)}</td>
                        <td>{formatPaidDate(b)}</td>
                        <td>{b.paymentMethod?.trim() || '—'}</td>
                        <td className="billing-table-actions">
                          <button
                            type="button"
                            className="bill-btn bill-btn--outline bill-btn--compact"
                            aria-expanded={open}
                            onClick={() => toggleBillDetail(b.billId)}
                          >
                            {open ? 'Hide' : 'Details'}
                          </button>
                          <button
                            type="button"
                            className="bill-btn bill-btn--outline bill-btn--compact"
                            onClick={() => handleDownloadPdf(b, 'receipt')}
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="bill-detail-table-row">
                          <td colSpan={6}>
                            <BillDetailPanel bill={b} kind="receipt" residentName={auth?.name} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
