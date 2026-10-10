// src/features/admin/utils/autoScheduleAlgorithm.js

/**
 * Thuật toán Auto Xếp Lịch Chiếu dựa trên 5 yếu tố:
 * 1. Ngày trong tuần
 * 2. Thời lượng chiếu phim
 * 3. Giờ vàng (Golden hour)
 * 4. Độ hot (Rating/Popularity)
 * 5. Thể loại phim
 */

const GOLDEN_HOURS = { start: 18, end: 21 }; // 18:00 - 21:00
const CLEANUP_TIME_MINUTES = 15; // 15 phút dọn dẹp

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Làm tròn số phút lên bội số của 5 (vd: 12 -> 15, 23 -> 25)
 */
const roundUpToNext5 = (minutes) => {
  return Math.ceil(minutes / 5) * 5;
};

/**
 * Chuyển số phút từ 00:00 thành 'HH:mm'
 */
const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Lấy thứ trong tuần từ Date (0 = CN, 1 = T2, ..., 6 = T7)
 */
const getDayOfWeek = (dateString) => {
  const date = new Date(dateString);
  return date.getDay();
};

/**
 * Đánh giá điểm ưu tiên cho 1 phim tại 1 khung giờ cụ thể
 */
const calculateScore = (movie, startTimeStr, dateString, config) => {
  let score = 0;
  const startMins = timeToMinutes(startTimeStr);
  const startHour = startMins / 60;
  const dayOfWeek = getDayOfWeek(dateString);

  // 1. Yếu tố Độ Hot (từ config Admin nhập vào UI)
  const hotness = config.movieHotness[movie.id] || 5;
  score += hotness * 10; // Trọng số cao nhất

  // 2. Yếu tố Ngày trong tuần
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6; // T6, T7, CN
  if (isWeekend) {
    score += 15;
  }

  // 3. Yếu tố Giờ Vàng
  const isGoldenHour = startHour >= GOLDEN_HOURS.start && startHour <= GOLDEN_HOURS.end;
  if (isGoldenHour) {
    score += 20;
    // Nếu phim siêu hot chiếu vào giờ vàng thì bạo phát điểm
    if (hotness >= 8) score += 30;
  }

  // 4. Yếu tố Thể loại (Genre Matching)
  // Giả định: Phim Hoạt Hình (Animation) hoặc Gia Đình (Family) ưu tiên ban ngày
  const genres = movie.genre ? movie.genre.toLowerCase() : '';
  const isFamilyFriendly = genres.includes('hoạt hình') || genres.includes('gia đình') || genres.includes('animation');
  const isHorror = genres.includes('kinh dị') || genres.includes('horror');

  if (isFamilyFriendly && startHour >= 8 && startHour <= 17) {
    score += 15; // Cộng điểm chiếu ban ngày
  }
  if (isHorror && startHour >= 21) {
    score += 15; // Cộng điểm chiếu tối muộn
  }

  return score;
};

/**
 * Hàm chính thực thi thuật toán
 * @param {Array} movies Danh Sách Phim được chọn
 * @param {Array} rooms Danh sách phòng chiếu của rạp
 * @param {String} dateString Ngày chiếu 'YYYY-MM-DD'
 * @param {Object} config Cấu hình { openingTime: '08:00', closingTime: '23:59', movieHotness: { movieId: score } }
 */
export const generateShowtimes = (movies, rooms, dateString, config) => {
  const generatedShowtimes = [];
  const openingMins = roundUpToNext5(timeToMinutes(config.openingTime || '08:00'));
  const closingMins = timeToMinutes(config.closingTime || '23:30'); // Không bắt đầu suất chiếu mới sau 23:30

  const sortedRooms = [...rooms].sort((a, b) => b.capacity - a.capacity);

  // Theo dõi thời gian khả dụng của từng phòng
  const roomAvailableTimes = {};
  sortedRooms.forEach(room => {
    roomAvailableTimes[room.id] = openingMins;
  });

  // Theo dõi số lượng suất chiếu đã xếp cho mỗi phim để phân bổ đồng đều
  const movieShowtimeCount = {};

  // Theo dõi thời điểm chiếu gần nhất của 1 phim ở 1 rạp để tránh trùng giờ (cách nhau tối thiểu 20p)
  const lastMovieStartTime = {}; // format: { theaterId_movieId: minutes }

  // Lặp để lấp đầy các phòng
  let canScheduleMore = true;

  while (canScheduleMore) {
    canScheduleMore = false;

    // Sắp xếp lại phòng để luôn ưu tiên phòng nào có thời gian trống SỚM NHẤT
    sortedRooms.sort((a, b) => roomAvailableTimes[a.id] - roomAvailableTimes[b.id]);

    // Lấy phòng có thời gian trống sớm nhất để xếp lịch
    const room = sortedRooms[0];
    let currentAvailableMin = roomAvailableTimes[room.id];

    if (currentAvailableMin >= closingMins) {
      break; // Phòng trống sớm nhất cũng đã hết giờ -> Tất cả các phòng đều đã hết giờ chiếu
    }

    // Tìm phim có Score cao nhất cho slot này
    let bestMovie = null;
    let highestScore = -999999;

    for (const movie of movies) {
      const duration = movie.duration || 120; // Default 120p
      const endMins = currentAvailableMin + duration;

      // Bỏ qua nếu thời gian chiếu vượt quá h đóng cửa muộn nhất (lưu ý: suất chiếu CUỐI CÙNG được phép bắt đầu lúc closingMins, nên không cấm endMins > closingMins)
      // Chỉ cấm nếu bắt đầu trễ hơn closingMins
      if (currentAvailableMin > closingMins) {
        continue;
      }

      // LỌC THEO ĐỊNH DẠNG HỖ TRỢ LOẠI PHÒNG (RoomType)
      let validFormatsForRoom = [];
      if (movie.formats && Array.isArray(movie.formats)) {
        validFormatsForRoom = movie.formats.filter(f =>
          f.supportedRoomTypes && f.supportedRoomTypes.includes(room.roomType)
        );
      }
      // Nếu phim không có định dạng nào hỗ trợ loại phòng này -> Gạch bỏ ngay
      if (validFormatsForRoom.length === 0) {
        continue;
      }

      let score = calculateScore(movie, minutesToTime(currentAvailableMin), dateString, config);

      // Tạo một hệ số ưu tiên (bias) ngẫu nhiên nhưng cố định cho từng cặp (Rạp - Phim)
      // Điều này giúp Rạp A ưu tiên chiếu nhiều phim X, trong khi Rạp B ưu tiên chiếu nhiều phim Y
      // Mức độ bias lên tới 40 điểm (tương đương bù được 3-4 suất chiếu so với phim khác)
      const randomBiasStr = `${room.theaterId}_${movie.id}`;
      let hash = 0;
      for (let i = 0; i < randomBiasStr.length; i++) {
        hash = Math.imul(31, hash) + randomBiasStr.charCodeAt(i) | 0;
      }
      const theaterMovieBias = Math.abs(hash) % 40;

      // Thêm nhiễu thời gian thực cực nhỏ (0-5) để phá vỡ các trường hợp hòa điểm tuyệt đối
      score += theaterMovieBias + (Math.random() * 5);

      const countKey = `${room.theaterId}_${movie.id}`;
      const count = movieShowtimeCount[countKey] || 0;

      // 1. BẮT BUỘC TẤT CẢ PHIM ĐỀU CÓ ÍT NHẤT 1 SUẤT CHIẾU TẠI MỖI RẠP
      if (count === 0) {
        score += 5000;
      }

      // 2. GIỚI HẠN SỐ SUẤT TỐI ĐA THEO ĐỘ HOT CHO MỖI RẠP
      const hotness = config.movieHotness[movie.id] || 5;
      // Không giới hạn cứng quá thấp, cho phép phim cực hot chiếm toàn bộ rạp nếu cần
      const maxShowtimes = Math.max(1, Math.round(hotness * 5));
      if (count >= maxShowtimes) {
        continue;
      }

      // Trừ điểm phạt nếu phim này đã được xếp nhiều suất tại rạp này
      score -= count * 15; // Phạt 15 điểm mỗi suất để nhường chỗ

      // TRÁNH TRÙNG LẶP: Nếu phim này vừa chiếu ở cùng 1 rạp cách đây dưới 20 phút -> Phạt cực nặng để cấm chiếu trùng
      const key = `${room.theaterId}_${movie.id}`;
      const lastStart = lastMovieStartTime[key];
      if (lastStart !== undefined && (currentAvailableMin - lastStart) < 20) {
        score -= 10000;
      }

      // Tránh tình trạng luôn chọn phim đầu tiên nếu điểm bằng nhau
      if (score === highestScore) {
        if (Math.random() > 0.5) {
          bestMovie = movie;
        }
      } else if (score > highestScore) {
        highestScore = score;
        bestMovie = movie;
      }
    }

    if (bestMovie && highestScore > -5000) {
      const duration = bestMovie.duration || 120;
      const endMins = currentAvailableMin + duration;

      const hotness = config.movieHotness[bestMovie.id] || 5;
      let assignedFormat = '2D Phụ đề'; // fallback
      if (bestMovie.formats && Array.isArray(bestMovie.formats)) {
        const validFormatsForRoom = bestMovie.formats.filter(f =>
          f.supportedRoomTypes && f.supportedRoomTypes.includes(room.roomType)
        );
        if (validFormatsForRoom.length > 0) {
          const formatIndex = Math.floor(Math.random() * validFormatsForRoom.length);
          assignedFormat = validFormatsForRoom[formatIndex].name;
        }
      }

      // Tạo suất chiếu
      generatedShowtimes.push({
        id: `preview_${Math.random().toString(36).substr(2, 9)}`,
        movieId: bestMovie.id,
        movieTitle: bestMovie.title,
        roomId: room.id,
        roomName: room.theaterName ? `${room.theaterName} - ${room.name}` : room.name,
        theaterId: room.theaterId,
        showDate: dateString,
        startTime: minutesToTime(currentAvailableMin),
        endTime: minutesToTime(endMins >= 1440 ? endMins - 1440 : endMins), // Xử lý qua ngày
        format: assignedFormat,
        score: (config.movieHotness[bestMovie.id] || 5) * 10 // Hiển thị 10-100 dựa theo rating
      });

      // Tăng số đếm suất chiếu của phim này lên tại rạp này
      const keyCount = `${room.theaterId}_${bestMovie.id}`;
      movieShowtimeCount[keyCount] = (movieShowtimeCount[keyCount] || 0) + 1;
      // Ghi nhận thời gian bắt đầu chiếu của phim này tại rạp này
      lastMovieStartTime[`${room.theaterId}_${bestMovie.id}`] = currentAvailableMin;

      // Cập nhật thời gian khả dụng tiếp theo của phòng (bao gồm dọn dẹp) VÀ LÀM TRÒN LÊN 5 PHÚT
      roomAvailableTimes[room.id] = roundUpToNext5(endMins + CLEANUP_TIME_MINUTES);
      canScheduleMore = true;
    } else {
      // Nếu không có phim nào phù hợp (tất cả đều bị phạt trùng giờ, hoặc thời lượng quá dài)
      // -> Tịnh tiến thời gian trống của phòng này lên 5 phút để thử lại ở vòng sau
      roomAvailableTimes[room.id] += 5;
      canScheduleMore = true;
    }
  }

  // Trả về danh sách sắp xếp theo thời gian và phòng
  return generatedShowtimes.sort((a, b) => {
    if (a.roomId !== b.roomId) return a.roomId - b.roomId;
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });
};
