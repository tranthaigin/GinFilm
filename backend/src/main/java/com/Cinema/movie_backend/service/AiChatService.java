package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.Movie;
import com.Cinema.movie_backend.repository.MovieRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiChatService {

    @Value("${google.gemini.api.keys:}")
    private List<String> apiKeys;

    @Value("${groq.api.key:}")
    private String groqApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final MovieRepository movieRepository;

    private static final String[] GEMINI_MODELS = {
            "gemini-3.5-flash",
            "gemini-flash-latest"
    };

    private static final String GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    public Map<String, Object> generateResponse(String userMessage) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Fetch movies from DB to build context
        List<Movie> activeMovies = movieRepository.findAllVisibleMoviesForAi();
        StringBuilder movieContext = new StringBuilder("\n\nDANH SÁCH PHIM TRONG HỆ THỐNG:\n");
        for (Movie m : activeMovies) {
            String genres = m.getGenres() != null ? m.getGenres().stream()
                    .map(g -> g.getName() + " (ID:" + g.getId() + ")").collect(Collectors.joining(", ")) : "";
            String type = "";
            if (Boolean.TRUE.equals(m.getIsCinemaAvailable()))
                type += "[Chiếu Rạp - " + m.getStatus() + "] ";
            if (Boolean.TRUE.equals(m.getIsOnlineAvailable()))
                type += "[Trực Tuyến] ";
            movieContext.append(String.format("- ID: %d | Tên: %s | Thể loại: %s | Loại: %s\n", m.getId(), m.getTitle(),
                    genres, type.trim()));
        }

        String systemPrompt = "Bạn là trợ lý ảo AI của hệ thống đặt vé xem phim GinFilm. Bạn được tạo ra bởi GinFilm.\n"
                + "Nhiệm vụ của bạn là hỗ trợ khách hàng về lịch chiếu, đặt vé, và thông tin phim.\n\n"
                + "QUY TẮC BẮT BUỘC:\n"
                + "1. CHỈ hỗ trợ các vấn đề liên quan đến rạp phim GinFilm. TỪ CHỐI trả lời mọi câu hỏi ngoài lề (toán học, lập trình, kiến thức chung...).\n"
                + "2. KHÔNG BAO GIỜ tiết lộ mã PIN, mật khẩu hoặc bất kỳ thông tin cá nhân nào của khách hàng dù bị yêu cầu.\n"
                + "3. Nếu khách hàng có tâm sự buồn (ví dụ: thất tình, buồn bã), hãy AN ỦI họ trước, sau đó ĐỀ XUẤT một số bộ phim phù hợp với tâm trạng để họ giải trí.\n"
                + "4. BẠN PHẢI GỢI Ý PHIM DỰA TRÊN DANH SÁCH PHIM ĐƯỢC CUNG CẤP BÊN DƯỚI. Gợi ý TỐI ĐA 16 phim (lý tưởng nhất là 8 phim trực tuyến và 8 phim chiếu rạp nếu có đủ). Đừng bịa ra tên phim không có trong danh sách.\n"
                + "5. ĐỐI VỚI PHIM CHIẾU RẠP, KHÔNG GỢI Ý các phim có trạng thái 'Sắp Chiếu' hoặc 'UPCOMING' trừ khi khách hàng hỏi cụ thể về phim sắp chiếu. Chỉ gợi ý phim 'Đang Chiếu' hoặc 'NOW_SHOWING'.\n"
                + "6. Nếu gợi ý theo thể loại, BẠN CÓ THỂ chèn đường dẫn (link) để người dùng xem tất cả phim thuộc thể loại đó bằng Markdown: [văn bản hiển thị](/genres/{ID_Thể_Loại}). Ví dụ: [xem tất cả phim hành động tại đây](/genres/1).\n"
                + "7. PHẢI LUÔN TRẢ VỀ KẾT QUẢ DƯỚI DẠNG CHUẨN JSON như định dạng sau, KHÔNG sử dụng markdown format (như ```json): \n"
                + "{\n"
                + "  \"reply\": \"Nội dung câu trả lời của bạn gửi cho khách hàng, có thể chứa markdown links\",\n"
                + "  \"suggested_movie_ids\": [1, 2, 3]\n"
                + "}\n"
                + "Lưu ý: Nếu không gợi ý phim nào, hãy để suggested_movie_ids là mảng rỗng [].\n"
                + "8. TRONG PHẦN `reply` GỬI CHO KHÁCH HÀNG, TUYỆT ĐỐI KHÔNG BAO GIỜ hiển thị bất kỳ ID nào của phim hay thể loại (ví dụ: TUYỆT ĐỐI KHÔNG được viết 'Moana (ID: 16)' hay 'ID: 16' hay '(ID:16)'). Khi nhắc tới tên phim hay thể loại, CHỈ VIẾT TÊN PHIM/THỂ LOẠI THUẦN TÚY (Ví dụ: Hành Trình Của Moana, Your Name). Bạn chỉ sử dụng số ID nội bộ để điền vào mảng `suggested_movie_ids` hoặc chèn vào đường dẫn Markdown [/genres/{ID_Thể_Loại}].\n"
                + "9. LUÔN TRẢ LỜI BẰNG TIẾNG VIỆT THUẦN TÚY. TUYỆT ĐỐI KHÔNG sử dụng ký tự tiếng Trung/Hán tự (như 浪漫, 电影...) hay trộn lẫn các ngôn ngữ khác.\n"
                + "\n=== HƯỚNG DẪN CÁC TÍNH NĂNG HỆ THỐNG CỦA GINFILM ===\n"
                + "Khi khách hàng hỏi về cách sử dụng hệ thống, hãy hướng dẫn chi tiết từng bước như sau (nếu họ hỏi về nghiệp vụ nào thì trả lời nghiệp vụ đó thật tự nhiên):\n"
                + "- Đăng ký / Đăng nhập: Nhấn vào nút 'Đăng nhập' ở góc phải trên cùng màn hình. Nếu đăng nhập: Nhập email/tên đăng nhập và mật khẩu, rồi nhấn 'Đăng nhập'. Nếu đăng ký: Chọn tab 'Đăng ký', điền đầy đủ thông tin rồi nhấn 'Tạo tài khoản'. Có hỗ trợ 'Đăng nhập với Google'. (Có thể dùng kèm link: [Đăng ký tại đây](/register) hoặc [Đăng nhập tại đây](/login)).\n"
                + "- Quên mật khẩu: Tại trang Đăng Nhập, nhấn dòng 'Quên mật khẩu?'. Nhập email đã đăng ký -> 'Gửi yêu cầu'. Mở email lấy mã OTP (6 số) -> Nhập OTP vào màn hình. Xác thực xong, nhập Mật khẩu mới và Xác nhận -> Nhấn Hoàn tất.\n"
                + "- Đổi mật khẩu: Đăng nhập -> Nhấn vào Avatar ở góc phải (hoặc trái) trên cùng -> Chọn 'Hồ sơ cá nhân'. Tìm mục 'Đổi mật khẩu' -> Nhập mật khẩu hiện tại -> Nhập mật khẩu mới và Xác nhận -> Nhấn 'Đổi mật khẩu' để lưu.\n"
                + "- Quên mã PIN: Nhấn Avatar -> 'Hồ sơ cá nhân' -> Chuyển sang tab 'Đặt lại mã PIN'. Nhấn vào 'Lấy Lại Mã PIN' -> Hệ thống hiện email của bạn, nhấn 'Gửi Email'. Lấy mã OTP từ email -> Nhập vào màn hình. Nhập mã PIN mới (6 số) và Xác nhận -> Hoàn tất.\n"
                + "- Đổi mã PIN: Nhấn Avatar -> 'Hồ sơ cá nhân' -> Tab 'Đặt lại mã PIN'. Nhập Mã PIN hiện tại -> Nhập Mã PIN mới (6 số) -> Xác nhận Mã PIN mới -> Nhấn 'Đổi mã PIN' để lưu.\n"
                + "- Cập nhật hồ sơ/bổ sung thông tin: Nhấn Avatar -> 'Hồ sơ cá nhân'. Nhấn nút 'Cập nhật thông tin' -> Chỉnh sửa Họ tên, SĐT, Ngày sinh... -> Nhấn 'Xác nhận' (hoặc Lưu) để lưu lại.\n"
                + "- Lịch sử hoạt động: Nhấn Avatar -> 'Hồ sơ cá nhân' -> Chuyển sang tab 'Lịch sử hoạt động'. Tại đây xem được các log bảo mật như đăng nhập, đổi mật khẩu.\n"
                + "- Vé của tôi: Nhấn Avatar -> 'Vé của tôi'. Tại đây có 2 mục: 'Phim Chiếu Rạp' (chứa mã QR và mã vé để quét khi đến rạp) và 'Phim Trực Tuyến' (chứa các phim online đã mua, có thể nhấn nút 'Xem phim' để bắt đầu xem).\n"
                + "- Xem phim online / Mua vé trực tuyến: Trên thanh menu chọn 'Phim Trực Tuyến' -> Chọn phim muốn xem. Nếu phim có phí, nhấn 'Mua vé ngay' -> Thanh toán. Nếu đã thanh toán hoặc phim miễn phí, nhấn nút 'Xem phim'.\n"
                + "- Mua vé tại rạp: Trên thanh menu chọn 'Phim Chiếu Rạp' -> Chọn phim đang chiếu. Nhấn 'Mua vé' -> Chọn Ngày, Chọn Rạp, Chọn Suất chiếu -> Chọn vị trí Ghế trên sơ đồ -> (Tùy chọn) Chọn bắp nước -> Tiến hành Thanh toán.\n"
                + "- Thanh toán bằng Stripe/VNPAY: Tại bước Thanh toán, kiểm tra lại đơn hàng. Chọn phương thức: Thẻ thanh toán quốc tế (Stripe) hoặc VNPAY (Quét mã QR/Thẻ ATM nội địa). Nhấn 'Xác nhận thanh toán' và làm theo hướng dẫn.\n"
                + "- Kích hoạt mã vé: Chọn 'Kích hoạt mã vé' trên menu. Nhập đoạn mã vé (Giftcode) vào ô. Nhập Mã PIN bảo mật của tài khoản để xác nhận. Nhấn 'Kích hoạt'. Phim sẽ được thêm vào kho 'Vé của tôi -> Phim Trực Tuyến'.\n"
                + "- Báo cáo sự cố: Bắt buộc Đăng nhập -> Nhấn vào biểu tượng Bóng Chat ở góc dưới phải. Chuyển sang tab 'Nhân viên CSKH'. Gõ tin nhắn mô tả chi tiết lỗi -> Nhấn Gửi để trò chuyện trực tiếp với Admin.\n"
                + "- Lịch sử giao dịch: Nhấn Avatar -> 'Lịch sử giao dịch'. Xem lại các đơn mua vé rạp, vé online, bắp nước và số tiền đã thanh toán.\n"
                + movieContext.toString();

        Map<String, Object> requestBody = new HashMap<>();

        // System instructions cho Gemini
        Map<String, Object> systemInstruction = new HashMap<>();
        Map<String, Object> sysParts = new HashMap<>();
        sysParts.put("text", systemPrompt);
        systemInstruction.put("parts", List.of(sysParts));
        requestBody.put("system_instruction", systemInstruction);

        // Enforce JSON format in Gemini Generation Config
        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("response_mime_type", "application/json");
        requestBody.put("generationConfig", generationConfig);

        // User content cho Gemini
        Map<String, Object> content = new HashMap<>();
        content.put("role", "user");
        Map<String, Object> parts = new HashMap<>();
        parts.put("text", userMessage);
        content.put("parts", List.of(parts));
        requestBody.put("contents", List.of(content));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        StringBuilder errors = new StringBuilder();

        // 1. Thử gọi Groq Llama 3 trước
        if (groqApiKey != null && !groqApiKey.trim().isEmpty()) {
            try {
                HttpHeaders groqHeaders = new HttpHeaders();
                groqHeaders.setContentType(MediaType.APPLICATION_JSON);
                groqHeaders.setBearerAuth(groqApiKey);

                Map<String, Object> groqBody = new HashMap<>();
                groqBody.put("model", "llama-3.3-70b-versatile");
                
                Map<String, String> responseFormat = new HashMap<>();
                responseFormat.put("type", "json_object");
                groqBody.put("response_format", responseFormat);
                
                List<Map<String, String>> messages = new ArrayList<>();
                messages.add(Map.of("role", "system", "content", systemPrompt));
                messages.add(Map.of("role", "user", "content", userMessage));
                groqBody.put("messages", messages);

                HttpEntity<Map<String, Object>> groqEntity = new HttpEntity<>(groqBody, groqHeaders);
                ResponseEntity<Map> groqResponse = restTemplate.postForEntity(GROQ_URL, groqEntity, Map.class);
                
                if (groqResponse.getStatusCode().is2xxSuccessful() && groqResponse.getBody() != null) {
                    String rawResponseText = extractGroqResponse(groqResponse.getBody());
                    if (rawResponseText != null) {
                        return parseAiResponse(rawResponseText, activeMovies, userMessage);
                    }
                }
            } catch (Exception e) {
                log.error("Lỗi khi gọi Groq API", e);
                errors.append("[Groq: ").append(e.getMessage()).append("] ");
            }
        }

        // 2. Fallback Google Gemini
        if (apiKeys != null) {
            for (String currentKey : apiKeys) {
                currentKey = currentKey.trim();
                if (currentKey.isEmpty()) continue;
                for (String model : GEMINI_MODELS) {
                    String url = GEMINI_BASE_URL + model + ":generateContent?key=" + currentKey;
                    try {
                        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
                        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                            String rawResponseText = extractGeminiResponse(response.getBody());
                            if (rawResponseText != null) {
                                return parseAiResponse(rawResponseText, activeMovies, userMessage);
                            }
                        }
                    } catch (org.springframework.web.client.HttpStatusCodeException e) {
                        errors.append("[").append(model).append("-Key").append(apiKeys.indexOf(currentKey)+1).append(": ").append(e.getStatusCode()).append("] ");
                    } catch (Exception e) {
                        errors.append("[").append(model).append("-Key").append(apiKeys.indexOf(currentKey)+1).append(": ").append(e.getMessage()).append("] ");
                    }
                }
            }
        }

        log.error("Tất cả các endpoint AI đều thất bại. Chi tiết: " + errors.toString());
        return Map.of("reply", "Xin lỗi, hiện tại hệ thống AI đang tạm thời quá tải hoặc bận. Vui lòng thử lại sau ít phút nhé!");
    }

    private String extractGeminiResponse(Map<String, Object> body) {
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                Map<String, Object> contentRes = (Map<String, Object>) candidates.get(0).get("content");
                if (contentRes != null) {
                    List<Map<String, Object>> resParts = (List<Map<String, Object>>) contentRes.get("parts");
                    if (resParts != null && !resParts.isEmpty()) {
                        return (String) resParts.get(0).get("text");
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse Gemini structure", e);
        }
        return null;
    }

    private String extractGroqResponse(Map<String, Object> body) {
        try {
            List<Map<String, Object>> choices = (List<Map<String, Object>>) body.get("choices");
            if (choices != null && !choices.isEmpty()) {
                Map<String, Object> messageMap = (Map<String, Object>) choices.get(0).get("message");
                if (messageMap != null) {
                    return (String) messageMap.get("content");
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse Groq structure", e);
        }
        return null;
    }

    private Map<String, Object> parseAiResponse(String rawResponse, List<Movie> activeMovies, String userMessage) {
        Map<String, Object> result = new HashMap<>();
        try {
            Map<String, Object> aiJson = readAiJson(rawResponse);
            String reply = (String) aiJson.getOrDefault("reply", "Tôi không có câu trả lời rõ ràng.");

            if (reply != null) {
                // Tự động loại bỏ bất kỳ ID phim/thể loại nào lỡ bị AI trả về trong reply (ví dụ: (ID: 16), ID: 16, (id 16))
                reply = reply.replaceAll("(?i)\\s*[(\\[]?\\b(id|mã)(\\s+phim)?\\b\\s*:?\\s*\\d+[)\\]]?", "");
                // Tự động sửa/loại bỏ ký tự Hán tự lỡ bị lây nhiễm (ví dụ '浪漫' -> 'lãng mạn')
                reply = reply.replaceAll("浪漫", "lãng mạn");
                reply = reply.replaceAll("[\\u4e00-\\u9fa5]", "");
                reply = reply.replaceAll("  +", " ");
                reply = reply.replaceAll(" ,", ",");
                reply = reply.replaceAll(" \\.", ".");
            }

            result.put("reply", reply);

            List<Integer> suggestedIds = new ArrayList<>();
            Object rawIds = aiJson.get("suggested_movie_ids");
            if (rawIds instanceof List) {
                for (Object idObj : (List<?>) rawIds) {
                    if (idObj instanceof Integer)
                        suggestedIds.add((Integer) idObj);
                    else if (idObj instanceof String) {
                        try {
                            suggestedIds.add(Integer.parseInt((String) idObj));
                        } catch (Exception ignored) {
                        }
                    }
                }
            }
            List<Map<String, Object>> resolvedMovies = new ArrayList<>();
            int onlineCount = 0;
            int cinemaCount = 0;
            boolean userRequestedUpcoming = userMessage.toLowerCase().contains("sắp chiếu")
                    || userMessage.toLowerCase().contains("upcoming");

            for (Integer id : suggestedIds) {
                for (Movie m : activeMovies) {
                    if (m.getId().intValue() == id.intValue()) {
                        String type = "";
                        if (Boolean.TRUE.equals(m.getIsOnlineAvailable())) {
                            type = "online";
                        } else if (Boolean.TRUE.equals(m.getIsCinemaAvailable())) {
                            type = "now_showing";
                            if (m.getStatus() != null && (m.getStatus().equalsIgnoreCase("UPCOMING")
                                    || m.getStatus().equalsIgnoreCase("Sắp chiếu"))) {
                                type = "upcoming";
                            }
                        }

                        if (type.equals("upcoming") && !userRequestedUpcoming) {
                            break; // Skip this movie, don't add to resolvedMovies
                        }

                        if (type.equals("online") && onlineCount >= 8) {
                            break;
                        }
                        if ((type.equals("now_showing") || type.equals("upcoming")) && cinemaCount >= 8) {
                            break;
                        }

                        Map<String, Object> movieMap = new HashMap<>();
                        movieMap.put("id", m.getId());
                        movieMap.put("title", m.getTitle());
                        movieMap.put("posterUrl", m.getPosterUrl());
                        movieMap.put("isCinemaAvailable", m.getIsCinemaAvailable());
                        movieMap.put("isOnlineAvailable", m.getIsOnlineAvailable());
                        movieMap.put("type", type);

                        // Also add genres for the badge
                        String genresStr = m.getGenres() != null
                                ? m.getGenres().stream().map(g -> g.getName()).collect(Collectors.joining(", "))
                                : "";
                        movieMap.put("genres", genresStr);

                        if (Boolean.TRUE.equals(m.getIsOnlineAvailable()) && m.getOnlinePrice() != null) {
                            movieMap.put("basePrice", m.getOnlinePrice().getBasePrice());
                            if (m.getOnlinePrice().getDiscountPercentage() != null
                                    && m.getOnlinePrice().getDiscountPercentage() > 0) {
                                java.math.BigDecimal discount = m.getOnlinePrice().getBasePrice()
                                        .multiply(java.math.BigDecimal
                                                .valueOf(m.getOnlinePrice().getDiscountPercentage()))
                                        .divide(java.math.BigDecimal.valueOf(100));
                                movieMap.put("salePrice", m.getOnlinePrice().getBasePrice().subtract(discount));
                            } else {
                                movieMap.put("salePrice", m.getOnlinePrice().getBasePrice());
                            }
                        }

                        resolvedMovies.add(movieMap);
                        if (type.equals("online"))
                            onlineCount++;
                        else
                            cinemaCount++;

                        break;
                    }
                }
            }
            if (!resolvedMovies.isEmpty()) {
                result.put("movies", resolvedMovies);
            }
        } catch (Exception e) {
            log.error("Failed to parse AI JSON response: {}", rawResponse, e);
            result.put("reply", rawResponse); // Fallback to raw string
        }
        return result;
    }

    private Map<String, Object> readAiJson(String rawResponse) throws Exception {
        String json = rawResponse == null ? "" : rawResponse.trim();

        if (json.startsWith("```")) {
            int firstLineBreak = json.indexOf('\n');
            if (firstLineBreak >= 0) {
                json = json.substring(firstLineBreak + 1);
            }
            int closingFence = json.lastIndexOf("```");
            if (closingFence >= 0) {
                json = json.substring(0, closingFence);
            }
            json = json.trim();
        }

        JsonNode node;
        try {
            node = objectMapper.readTree(json);
        } catch (Exception directParseError) {
            int firstObject = json.indexOf('{');
            int lastObject = json.lastIndexOf('}');
            if (firstObject < 0 || lastObject <= firstObject) {
                throw directParseError;
            }
            node = objectMapper.readTree(json.substring(firstObject, lastObject + 1));
        }

        for (int depth = 0; depth < 2 && node != null && node.isTextual(); depth++) {
            node = objectMapper.readTree(node.asText());
        }
        if (node != null && node.isArray() && !node.isEmpty()) {
            node = node.get(0);
        }
        if (node == null || !node.isObject()) {
            throw new IllegalArgumentException("AI response is not a JSON object");
        }

        return objectMapper.convertValue(node, new TypeReference<Map<String, Object>>() {
        });
    }
}
