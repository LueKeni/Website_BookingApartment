import crypto from 'crypto';
import PaymentTransaction from '../models/PaymentTransaction.js';
import User from '../models/User.js';

const DEFAULT_MOMO_ENDPOINT = 'https://test-payment.momo.vn/v2/gateway/api/create';
const DEFAULT_MOMO_QUERY_ENDPOINT = 'https://test-payment.momo.vn/v2/gateway/api/query';
const LEGACY_ENDPOINT_KEYWORD = '/gw_payment/transactionProcessor';

const DEFAULT_POINT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    points: 20,
    amountVnd: 20000,
    description: 'Top-up 20 points for listing promotion.'
  },
  {
    id: 'growth',
    name: 'Growth Pack',
    points: 60,
    amountVnd: 50000,
    description: 'Top-up 60 points with better value.'
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    points: 140,
    amountVnd: 100000,
    description: 'Top-up 140 points for active agents.'
  }
];

const getBoostPointCost = () => {
  const parsed = Number.parseInt(process.env.POINTS_PER_BOOST || '1', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const getFirstEnvValue = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

const isLegacyMomoEndpoint = (endpoint) => {
  const normalized = typeof endpoint === 'string' ? endpoint.toLowerCase() : '';
  return normalized.includes(LEGACY_ENDPOINT_KEYWORD.toLowerCase());
};

const normalizeMomoRequestType = (requestType, legacyMode) => {
  const normalized = typeof requestType === 'string' ? requestType.trim() : '';

  if (!normalized) {
    return legacyMode ? 'captureMoMoWallet' : 'captureWallet';
  }

  if (legacyMode && normalized === 'captureWallet') {
    return 'captureMoMoWallet';
  }

  if (!legacyMode && normalized === 'captureMoMoWallet') {
    return 'captureWallet';
  }

  return normalized;
};

const getPointPackages = () => {
  const raw = process.env.POINT_PACKAGES_JSON;
  if (!raw) {
    return DEFAULT_POINT_PACKAGES;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_POINT_PACKAGES;
    }

    const normalized = parsed
      .map((item) => {
        const id = typeof item?.id === 'string' ? item.id.trim() : '';
        const name = typeof item?.name === 'string' ? item.name.trim() : '';
        const description = typeof item?.description === 'string' ? item.description.trim() : '';
        const points = Number.parseInt(item?.points, 10);
        const amountVnd = Number.parseInt(item?.amountVnd, 10);

        if (!id || !name || !Number.isInteger(points) || points <= 0 || !Number.isInteger(amountVnd) || amountVnd <= 0) {
          return null;
        }

        return { id, name, points, amountVnd, description };
      })
      .filter(Boolean);

    return normalized.length ? normalized : DEFAULT_POINT_PACKAGES;
  } catch (error) {
    return DEFAULT_POINT_PACKAGES;
  }
};

const getMomoConfig = () => ({
  endpoint: getFirstEnvValue('MOMO_ENDPOINT', 'MomoAPI__MomoApiUrl') || DEFAULT_MOMO_ENDPOINT,
  queryEndpoint: getFirstEnvValue('MOMO_QUERY_ENDPOINT', 'MomoAPI__QueryUrl') || DEFAULT_MOMO_QUERY_ENDPOINT,
  partnerCode: getFirstEnvValue('MOMO_PARTNER_CODE', 'MomoAPI__PartnerCode'),
  accessKey: getFirstEnvValue('MOMO_ACCESS_KEY', 'MomoAPI__AccessKey'),
  secretKey: getFirstEnvValue('MOMO_SECRET_KEY', 'MomoAPI__SecretKey'),
  redirectUrl: getFirstEnvValue('MOMO_REDIRECT_URL', 'MomoAPI__ReturnUrl'),
  ipnUrl: getFirstEnvValue('MOMO_IPN_URL', 'MomoAPI__NotifyUrl'),
  requestType: getFirstEnvValue('MOMO_REQUEST_TYPE', 'MomoAPI__RequestType') || 'captureWallet'
});

const isMomoConfigured = () => {
  const config = getMomoConfig();
  return Boolean(
    config.partnerCode &&
      config.accessKey &&
      config.secretKey &&
      config.redirectUrl &&
      config.ipnUrl
  );
};

const signWithSecret = (rawSignature, secretKey) =>
  crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

const buildCreateSignaturePayload = ({
  accessKey,
  amount,
  extraData,
  ipnUrl,
  legacyMode,
  orderId,
  orderInfo,
  partnerCode,
  redirectUrl,
  requestId,
  requestType
}) => {
  if (legacyMode) {
    return [
      `partnerCode=${partnerCode}`,
      `accessKey=${accessKey}`,
      `requestId=${requestId}`,
      `amount=${amount}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `returnUrl=${redirectUrl}`,
      `notifyUrl=${ipnUrl}`,
      `extraData=${extraData}`
    ].join('&');
  }

  return [
    `accessKey=${accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `ipnUrl=${ipnUrl}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${partnerCode}`,
    `redirectUrl=${redirectUrl}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`
  ].join('&');
};

const buildIpnSignaturePayload = (payload) => {
  const isLegacyPayload = Object.prototype.hasOwnProperty.call(payload, 'errorCode') &&
    !Object.prototype.hasOwnProperty.call(payload, 'resultCode');

  const orderedKeys = [
    ...(isLegacyPayload
      ? [
          'partnerCode',
          'accessKey',
          'requestId',
          'amount',
          'orderId',
          'orderInfo',
          'orderType',
          'transId',
          'message',
          'localMessage',
          'responseTime',
          'errorCode',
          'payType',
          'extraData'
        ]
      : [
          'accessKey',
          'amount',
          'extraData',
          'message',
          'orderId',
          'orderInfo',
          'orderType',
          'partnerCode',
          'payType',
          'requestId',
          'responseTime',
          'resultCode',
          'transId'
        ])
  ];

  return orderedKeys
    .filter((key) => Object.prototype.hasOwnProperty.call(payload, key) && typeof payload[key] !== 'undefined')
    .map((key) => `${key}=${payload[key]}`)
    .join('&');
};

const parseResultCode = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : -1;
};

const buildQuerySignaturePayload = ({ accessKey, orderId, partnerCode, requestId }) =>
  [
    `accessKey=${accessKey}`,
    `orderId=${orderId}`,
    `partnerCode=${partnerCode}`,
    `requestId=${requestId}`
  ].join('&');

const queryMomoTransactionByOrderId = async (orderId) => {
  const config = getMomoConfig();
  if (!config.partnerCode || !config.accessKey || !config.secretKey || !config.queryEndpoint) {
    return null;
  }

  const requestId = `QUERY-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const rawSignature = buildQuerySignaturePayload({
    accessKey: config.accessKey,
    orderId,
    partnerCode: config.partnerCode,
    requestId
  });

  const signature = signWithSecret(rawSignature, config.secretKey);

  const response = await fetch(config.queryEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      partnerCode: config.partnerCode,
      requestId,
      orderId,
      lang: 'vi',
      signature
    })
  });

  let responseBody = {};
  try {
    responseBody = await response.json();
  } catch (error) {
    responseBody = {};
  }

  const resultCode = parseResultCode(
    typeof responseBody?.resultCode !== 'undefined' ? responseBody.resultCode : responseBody?.errorCode
  );

  return {
    ok: response.ok,
    resultCode,
    message: typeof responseBody?.message === 'string' ? responseBody.message : '',
    transId: typeof responseBody?.transId !== 'undefined' ? String(responseBody.transId) : '',
    responseBody
  };
};

const finalizePaidTransaction = async (transaction, paymentUpdate) => {
  const creditedTransaction = await PaymentTransaction.findOneAndUpdate(
    { _id: transaction._id, isPointCredited: false },
    {
      $set: {
        ...paymentUpdate,
        status: 'PAID',
        isPointCredited: true,
        completedAt: new Date()
      }
    },
    { new: true }
  );

  if (creditedTransaction) {
    await User.findByIdAndUpdate(creditedTransaction.userId, {
      $inc: { agentPoints: creditedTransaction.points }
    });

    return creditedTransaction;
  }

  if (transaction.status !== 'PAID') {
    await PaymentTransaction.findByIdAndUpdate(transaction._id, {
      $set: {
        ...paymentUpdate,
        status: 'PAID',
        completedAt: transaction.completedAt || new Date()
      }
    });
  }

  return PaymentTransaction.findById(transaction._id);
};

const shouldRetryWithV2Endpoint = (resultCode, message) => {
  if (resultCode === 44) {
    return true;
  }

  const normalizedMessage = typeof message === 'string' ? message.toLowerCase() : '';
  return normalizedMessage.includes('service not support');
};

const sendMomoCreateRequest = async ({
  config,
  amount,
  extraData,
  legacyMode,
  orderId,
  orderInfo,
  requestId,
  requestType,
  endpoint
}) => {
  const signaturePayload = buildCreateSignaturePayload({
    accessKey: config.accessKey,
    amount,
    extraData,
    ipnUrl: config.ipnUrl,
    legacyMode,
    orderId,
    orderInfo,
    partnerCode: config.partnerCode,
    redirectUrl: config.redirectUrl,
    requestId,
    requestType
  });

  const signature = signWithSecret(signaturePayload, config.secretKey);

  const requestBody = legacyMode
    ? {
        partnerCode: config.partnerCode,
        accessKey: config.accessKey,
        requestId,
        amount,
        orderId,
        orderInfo,
        returnUrl: config.redirectUrl,
        notifyUrl: config.ipnUrl,
        requestType,
        extraData,
        signature
      }
    : {
        partnerCode: config.partnerCode,
        partnerName: 'UrbanNest',
        storeId: 'UrbanNest',
        requestId,
        amount,
        orderId,
        orderInfo,
        redirectUrl: config.redirectUrl,
        ipnUrl: config.ipnUrl,
        lang: 'vi',
        requestType,
        autoCapture: true,
        orderType: 'momo_wallet',
        extraData,
        signature
      };

  const rawResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  let responseBody = {};
  try {
    responseBody = await rawResponse.json();
  } catch (error) {
    responseBody = {};
  }

  const resultCode = parseResultCode(
    typeof responseBody?.resultCode !== 'undefined' ? responseBody.resultCode : responseBody?.errorCode
  );

  return {
    ok: rawResponse.ok,
    endpoint,
    legacyMode,
    requestType,
    resultCode,
    responseBody
  };
};

const listPointPackages = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      momoEnabled: isMomoConfigured(),
      pointCostPerBoost: getBoostPointCost(),
      packages: getPointPackages()
    }
  });
};

const createMomoPayment = async (req, res) => {
  try {
    const { packageId } = req.body;

    if (!packageId || typeof packageId !== 'string') {
      return res.status(400).json({ success: false, message: 'packageId is required' });
    }

    const pointPackage = getPointPackages().find((item) => item.id === packageId.trim());
    if (!pointPackage) {
      return res.status(400).json({ success: false, message: 'Invalid point package' });
    }

    const config = getMomoConfig();
    if (!isMomoConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'MoMo is not configured. Please set MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY, MOMO_REDIRECT_URL and MOMO_IPN_URL (or ASP.NET-style MomoAPI__* keys).'
      });
    }

    const legacyMode = isLegacyMomoEndpoint(config.endpoint);
    const requestType = normalizeMomoRequestType(config.requestType, legacyMode);

    const randomSuffix = crypto.randomBytes(5).toString('hex');
    const orderId = `MOMO-${Date.now()}-${randomSuffix}`;
    const requestId = orderId;
    const amount = String(pointPackage.amountVnd);
    const orderInfo = `UrbanNest point top-up (${pointPackage.points} points)`;
    const extraData = Buffer.from(
      JSON.stringify({
        userId: req.user.id,
        packageId: pointPackage.id,
        points: pointPackage.points
      })
    ).toString('base64');

    const primaryAttempt = await sendMomoCreateRequest({
      config,
      amount,
      extraData,
      legacyMode,
      orderId,
      orderInfo,
      requestId,
      requestType,
      endpoint: config.endpoint
    });

    let fallbackAttempt = null;
    let finalAttempt = primaryAttempt;

    if (
      legacyMode &&
      shouldRetryWithV2Endpoint(primaryAttempt.resultCode, primaryAttempt.responseBody?.message)
    ) {
      const fallbackRequestType = normalizeMomoRequestType(config.requestType, false);
      fallbackAttempt = await sendMomoCreateRequest({
        config,
        amount,
        extraData,
        legacyMode: false,
        orderId,
        orderInfo,
        requestId,
        requestType: fallbackRequestType,
        endpoint: DEFAULT_MOMO_ENDPOINT
      });

      finalAttempt = fallbackAttempt;
    }

    const momoResultCode = finalAttempt.resultCode;
    const momoResponse = finalAttempt.responseBody;
    const status = finalAttempt.ok && momoResultCode === 0 ? 'PENDING' : 'FAILED';

    await PaymentTransaction.create({
      userId: req.user.id,
      provider: 'MOMO',
      orderId,
      requestId,
      packageId: pointPackage.id,
      amount: pointPackage.amountVnd,
      points: pointPackage.points,
      status,
      resultCode: momoResultCode,
      message: momoResponse?.message || '',
      payUrl: momoResponse?.payUrl || '',
      deeplink: momoResponse?.deeplink || momoResponse?.deeplinkWebInApp || '',
      qrCodeUrl: momoResponse?.qrCodeUrl || '',
      rawResponse:
        fallbackAttempt === null
          ? {
              endpoint: primaryAttempt.endpoint,
              requestType: primaryAttempt.requestType,
              response: primaryAttempt.responseBody
            }
          : {
              primary: {
                endpoint: primaryAttempt.endpoint,
                requestType: primaryAttempt.requestType,
                response: primaryAttempt.responseBody
              },
              fallback: {
                endpoint: fallbackAttempt.endpoint,
                requestType: fallbackAttempt.requestType,
                response: fallbackAttempt.responseBody
              }
            }
    });

    if (!finalAttempt.ok || momoResultCode !== 0 || !momoResponse?.payUrl) {
      return res.status(400).json({
        success: false,
        message: momoResponse?.message || 'Cannot create MoMo payment',
        data: {
          orderId,
          resultCode: momoResultCode
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'MoMo payment created successfully',
      data: {
        orderId,
        requestId,
        amount: pointPackage.amountVnd,
        points: pointPackage.points,
        payUrl: momoResponse.payUrl,
        deeplink: momoResponse?.deeplink || momoResponse?.deeplinkWebInApp || '',
        qrCodeUrl: momoResponse?.qrCodeUrl || ''
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handleMomoIpn = async (req, res) => {
  try {
    const payload = req.body || {};
    const orderId = typeof payload.orderId === 'string' ? payload.orderId.trim() : '';
    const signature = typeof payload.signature === 'string' ? payload.signature.trim() : '';

    if (!orderId || !signature) {
      return res.status(400).json({ resultCode: 1, message: 'Invalid payload' });
    }

    const { secretKey } = getMomoConfig();
    if (!secretKey) {
      return res.status(500).json({ resultCode: 1, message: 'Missing MoMo secret key (MOMO_SECRET_KEY or MomoAPI__SecretKey)' });
    }

    const rawSignature = buildIpnSignaturePayload(payload);
    const expectedSignature = signWithSecret(rawSignature, secretKey);

    if (signature !== expectedSignature) {
      return res.status(400).json({ resultCode: 97, message: 'Invalid signature' });
    }

    const transaction = await PaymentTransaction.findOne({ orderId });
    if (!transaction) {
      return res.status(404).json({ resultCode: 1, message: 'Order not found' });
    }

    const resultCode = parseResultCode(
      typeof payload.resultCode !== 'undefined' ? payload.resultCode : payload.errorCode
    );
    const paymentUpdate = {
      resultCode,
      message: typeof payload.message === 'string' ? payload.message : '',
      transId: typeof payload.transId !== 'undefined' ? String(payload.transId) : '',
      rawResponse: payload
    };

    if (resultCode === 0) {
      await finalizePaidTransaction(transaction, paymentUpdate);

      return res.status(200).json({ resultCode: 0, message: 'IPN processed' });
    }

    if (transaction.status !== 'PAID') {
      await PaymentTransaction.findByIdAndUpdate(transaction._id, {
        $set: {
          ...paymentUpdate,
          status: 'FAILED',
          completedAt: new Date()
        }
      });
    }

    return res.status(200).json({ resultCode: 0, message: 'IPN processed' });
  } catch (error) {
    return res.status(500).json({ resultCode: 1, message: error.message });
  }
};

const getMomoPaymentStatus = async (req, res) => {
  try {
    const orderId = typeof req.params.orderId === 'string' ? req.params.orderId.trim() : '';
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Invalid order id' });
    }

    let transaction = await PaymentTransaction.findOne({
      orderId,
      provider: 'MOMO',
      userId: req.user.id
    }).select('orderId requestId status amount points message resultCode payUrl createdAt completedAt');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Payment transaction not found' });
    }

    if (transaction.status === 'PENDING') {
      try {
        const momoQuery = await queryMomoTransactionByOrderId(orderId);
        if (momoQuery && momoQuery.resultCode === 0) {
          await finalizePaidTransaction(transaction, {
            resultCode: momoQuery.resultCode,
            message: momoQuery.message,
            transId: momoQuery.transId,
            rawResponse: {
              source: 'MOMO_QUERY',
              response: momoQuery.responseBody
            }
          });

          transaction = await PaymentTransaction.findOne({
            orderId,
            provider: 'MOMO',
            userId: req.user.id
          }).select('orderId requestId status amount points message resultCode payUrl createdAt completedAt');
        }
      } catch (queryError) {
        // Ignore query fallback errors and keep existing transaction status.
      }
    }

    return res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export {
  createMomoPayment,
  getMomoPaymentStatus,
  handleMomoIpn,
  listPointPackages
};
