package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.PaymentRequest;
import com.Cinema.movie_backend.enums.PaymentMethod;
import com.Cinema.movie_backend.service.BookingService;
import com.Cinema.movie_backend.service.PaymentConfirmationService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {
    private final BookingService bookingService;
    private final PaymentConfirmationService confirmations;
    private final com.Cinema.movie_backend.service.StripeGateway stripeGateway;
    @Value("${app.frontend.url:http://localhost:5173}") private String frontendUrl;
    @Value("${stripe.webhook.secret:${STRIPE_WEBHOOK_SECRET:}}") private String webhookSecret;

    public record StripeOrder(Long bookingId, Long movieId, Integer pointsToUse, String promoCode) { }

    @PostMapping("/create-payment-intent")
    public ResponseEntity<?> createPaymentIntent(@RequestBody StripeOrder request, Principal principal) {
        String secret;
        if (request.bookingId() != null && request.movieId() == null) {
            PaymentRequest payment = new PaymentRequest();
            payment.setPaymentMethod(PaymentMethod.STRIPE);
            payment.setPointsToUse(request.pointsToUse());
            payment.setPromoCode(request.promoCode());
            secret = bookingService.createPayment(request.bookingId(), payment);
        } else if (request.movieId() != null && request.bookingId() == null) {
            secret = bookingService.purchaseOnlineTicket(request.movieId(), principal.getName(), null,
                    "STRIPE", request.pointsToUse(), request.promoCode());
        } else throw new IllegalArgumentException("Specify exactly one booking or movie");
        var intent = stripeGateway.retrieve(secret.split("_secret_")[0]);
        return ResponseEntity.ok(Map.of("clientSecret", secret, "amount", intent.getAmount()));
    }

    @PostMapping("/stripe-webhook")
    public ResponseEntity<?> stripeWebhook(@RequestBody String body,
            @RequestHeader("Stripe-Signature") String signature) {
        if (webhookSecret == null || webhookSecret.isBlank()) return ResponseEntity.status(503).build();
        try {
            var event = com.stripe.net.Webhook.constructEvent(body, signature, webhookSecret);
            if ("payment_intent.succeeded".equals(event.getType())) {
                var tree = new com.fasterxml.jackson.databind.ObjectMapper().readTree(body);
                String intentId = tree.path("data").path("object").path("id").asText();
                confirmations.confirmStripeWebhook(intentId);
            }
            return ResponseEntity.ok(Map.of("received", true));
        } catch (com.stripe.exception.SignatureVerificationException | java.io.IOException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/confirm-stripe")
    public ResponseEntity<?> confirmStripe(@RequestBody Map<String, String> request, Principal principal) {
        boolean confirmed = confirmations.confirmStripe(request.get("paymentIntentId"), principal.getName());
        return ResponseEntity.ok(Map.of("confirmed", confirmed));
    }

    @GetMapping("/vnpay-callback")
    public ResponseEntity<?> handleVnpayCallback(@RequestParam Map<String, String> fields) {
        boolean success = confirmations.confirmVnpay(fields);
        String path = fields.getOrDefault("vnp_TxnRef", "").startsWith("POS-") ? "/staff/pos" : "/my-tickets";
        return ResponseEntity.status(302).location(URI.create(frontendUrl + path + "?success=" + success)).build();
    }
}
