package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.service.RefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/refunds")
public class AdminRefundController {
    private final RefundService refunds;
    public record RefundRequest(String receipt) {}

    @GetMapping
    public List<RefundService.RefundOrder> pending() { return refunds.pending(); }

    @PostMapping("/{kind}/{id}")
    public RefundService.RefundOrder process(@PathVariable String kind, @PathVariable Long id,
                                           @RequestBody RefundRequest request, Principal principal) {
        return refunds.process(kind, id, request.receipt(), principal.getName());
    }
}
