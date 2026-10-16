package com.Cinema.movie_backend.service;

import com.stripe.model.PaymentIntent;
import com.stripe.net.RequestOptions;
import com.stripe.param.PaymentIntentCreateParams;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class StripeGateway {
    @Value("${stripe.api.key:${STRIPE_SECRET_KEY:}}") private String apiKey;

    private RequestOptions options() {
        if (apiKey == null || apiKey.isBlank()) throw new IllegalStateException("Chưa cấu hình Stripe");
        return RequestOptions.builder().setApiKey(apiKey).build();
    }

    public PaymentIntent create(long amount, String reference, String email) {
        if (amount <= 0) throw new IllegalArgumentException("Số tiền thanh toán không hợp lệ");
        try {
            var params = PaymentIntentCreateParams.builder().setAmount(amount).setCurrency("vnd")
                    .putMetadata("reference", reference).putMetadata("owner", email)
                    .setAutomaticPaymentMethods(PaymentIntentCreateParams.AutomaticPaymentMethods.builder().setEnabled(true).build())
                    .build();
            return PaymentIntent.create(params, options());
        } catch (com.stripe.exception.StripeException ex) {
            throw new IllegalStateException("Không thể tạo giao dịch Stripe", ex);
        }
    }

    public PaymentIntent retrieve(String id) {
        if (id == null || !id.startsWith("pi_")) throw new IllegalArgumentException("Giao dịch Stripe không hợp lệ");
        try { return PaymentIntent.retrieve(id, options()); }
        catch (com.stripe.exception.StripeException ex) { throw new IllegalArgumentException("Không thể xác minh giao dịch Stripe", ex); }
    }

    public com.stripe.model.Refund refund(String intentId, long amount, String operationId) {
        try {
            var existing = com.stripe.model.Refund.list(
                    com.stripe.param.RefundListParams.builder().setPaymentIntent(intentId).setLimit(100L).build(), options());
            var recovered = recoverRefund(existing.autoPagingIterable(), intentId, amount, operationId);
            if (recovered != null) return retrieveRefund(recovered.getId());
            var request = com.stripe.param.RefundCreateParams.builder().setPaymentIntent(intentId).setAmount(amount)
                    .putMetadata("operation", operationId).build();
            options();
            var options = RequestOptions.builder().setApiKey(apiKey).setIdempotencyKey(operationId).build();
            var created = com.stripe.model.Refund.create(request, options);
            return com.stripe.model.Refund.retrieve(created.getId(), options());
        } catch (com.stripe.exception.StripeException ex) {
            throw new IllegalStateException("Không thể xác nhận hoàn tiền qua Stripe", ex);
        }
    }

    public com.stripe.model.Refund retrieveRefund(String id) {
        if (id == null || !id.startsWith("re_")) throw new IllegalArgumentException("Mã hoàn tiền Stripe không hợp lệ");
        try { return com.stripe.model.Refund.retrieve(id, options()); }
        catch (com.stripe.exception.StripeException ex) { throw new IllegalStateException("Không thể kiểm tra khoản hoàn tiền Stripe", ex); }
    }

    // Recover a prior operation even after Stripe's idempotency key retention expires.
    static com.stripe.model.Refund recoverRefund(Iterable<com.stripe.model.Refund> refunds,
            String intentId, long amount, String operationId) {
        com.stripe.model.Refund recovered = null;
        boolean partialRefund = false;
        for (var refund : refunds) {
            if (!intentId.equals(refund.getPaymentIntent()) || "failed".equals(refund.getStatus())
                    || "canceled".equals(refund.getStatus())) continue;
            if (Long.valueOf(amount).equals(refund.getAmount()) && "vnd".equals(refund.getCurrency())) {
                boolean sameOperation = refund.getMetadata() != null && operationId.equals(refund.getMetadata().get("operation"));
                if (sameOperation || "succeeded".equals(refund.getStatus()) || "pending".equals(refund.getStatus())) recovered = refund;
            } else partialRefund = true;
        }
        if (partialRefund) throw new IllegalStateException("Giao dịch đã có khoản hoàn một phần; cần đối soát Stripe trước khi hoàn tiếp");
        return recovered;
    }
}
