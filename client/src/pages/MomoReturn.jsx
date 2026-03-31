import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';

const statusMetaMap = {
  PAID: {
    title: 'Payment successful',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  },
  PENDING: {
    title: 'Payment is processing',
    tone: 'border-amber-200 bg-amber-50 text-amber-700'
  },
  FAILED: {
    title: 'Payment failed',
    tone: 'border-rose-200 bg-rose-50 text-rose-700'
  }
};

const MomoReturn = () => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('PENDING');
  const [message, setMessage] = useState('Verifying your payment status...');
  const [paymentData, setPaymentData] = useState(null);

  const orderId = useMemo(() => searchParams.get('orderId') || '', [searchParams]);
  const fallbackResultCode = useMemo(() => searchParams.get('resultCode') || '', [searchParams]);

  useEffect(() => {
    let active = true;

    const verifyPayment = async () => {
      if (!orderId) {
        if (active) {
          setStatus('FAILED');
          setMessage('Missing order id from MoMo redirect URL.');
          setLoading(false);
        }
        return;
      }

      if (!isAuthenticated) {
        if (active) {
          setStatus(fallbackResultCode === '0' ? 'PENDING' : 'FAILED');
          setMessage('Please sign in again to verify this payment transaction.');
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.get(`/payments/momo/status/${encodeURIComponent(orderId)}`);
        const transaction = response?.data?.data;

        if (!active) {
          return;
        }

        const nextStatus = transaction?.status || 'PENDING';
        setStatus(nextStatus);
        setPaymentData(transaction || null);

        if (nextStatus === 'PAID') {
          await refreshProfile();
          setMessage(`Your account has been credited with ${Number(transaction?.points || 0)} point(s).`);
          return;
        }

        if (nextStatus === 'FAILED') {
          setMessage(transaction?.message || 'MoMo did not complete this payment.');
          return;
        }

        setMessage('MoMo is still processing this payment. Please refresh in a moment.');
      } catch (error) {
        if (!active) {
          return;
        }

        const apiMessage = error?.response?.data?.message;
        if (fallbackResultCode === '0') {
          setStatus('PENDING');
          setMessage(apiMessage || 'Payment returned successfully, but transaction confirmation is still pending.');
        } else {
          setStatus('FAILED');
          setMessage(apiMessage || 'Cannot verify payment status right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    verifyPayment();

    return () => {
      active = false;
    };
  }, [fallbackResultCode, isAuthenticated, orderId, refreshProfile]);

  const statusMeta = statusMetaMap[status] || statusMetaMap.PENDING;

  return (
    <section className="mx-auto w-full max-w-2xl space-y-5">
      <div className="rounded-[1.6rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_45px_-30px_rgba(15,45,63,0.65)] md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">MoMo Payment Result</p>
        <h1 className="display-font mt-2 text-3xl text-[#0f2d3f] md:text-4xl">{statusMeta.title}</h1>
        <p className="mt-2 text-sm text-slate-600">Order ID: {orderId || '-'}</p>
      </div>

      <article className={`rounded-2xl border px-4 py-4 text-sm font-semibold ${statusMeta.tone}`}>
        {loading ? 'Checking transaction status...' : message}
      </article>

      {paymentData && (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>
            Amount: <span className="font-semibold">{Number(paymentData.amount || 0).toLocaleString('vi-VN')} VND</span>
          </p>
          <p className="mt-1">
            Points: <span className="font-semibold">{Number(paymentData.points || 0)}</span>
          </p>
          <p className="mt-1">
            Status: <span className="font-semibold">{paymentData.status}</span>
          </p>
        </article>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          to="/dashboard"
          className="rounded-full bg-[#0f2d3f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#173f56]"
        >
          Go to Dashboard
        </Link>
        <Link
          to="/"
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
        >
          Back to Home
        </Link>
      </div>
    </section>
  );
};

export default MomoReturn;
