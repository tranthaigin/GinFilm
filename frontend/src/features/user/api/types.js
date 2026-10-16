/**
 * @file Shared API contract types (JSDoc). Mirror these DTOs on Spring Boot backend.
 */

/**
 * @template T
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {string} message
 * @property {T} [data]
 * @property {import('./errors.js').FieldError[]} [errors]
 * @property {string} timestamp
 */

/**
 * @typedef {'MALE' | 'FEMALE' | 'OTHER'} Gender
 */

/**
 * @typedef {Object} RegisterRequest
 * @property {string} fullName
 * @property {string} email
 * @property {string} password
 * @property {string} confirmPassword
 * @property {string} dateOfBirth - ISO date YYYY-MM-DD
 * @property {Gender} gender
 * @property {string} phone
 */

/**
 * @typedef {Object} LoginRequest
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} UserDto
 * @property {number} id
 * @property {string} fullName
 * @property {string} username
 * @property {string} email
 * @property {string} phone
 * @property {Gender} gender
 * @property {string} dateOfBirth
 */

/**
 * @typedef {Object} AuthTokenResponse
 * @property {string} accessToken
 * @property {string} refreshToken
 * @property {string} tokenType - e.g. "Bearer"
 * @property {number} expiresIn - seconds
 * @property {UserDto} user
 */

/**
 * @typedef {'NOW_SHOWING' | 'COMING_SOON' | 'PRESALE'} MovieStatus
 */

/**
 * @typedef {Object} MovieDto
 * @property {number} id
 * @property {string} title
 * @property {number} rating
 * @property {string} genre
 * @property {string} posterUrl
 * @property {MovieStatus} status
 * @property {boolean} trending
 * @property {boolean} highlighted
 */

/**
 * @typedef {Object} ShowDto
 * @property {number} id
 * @property {number} movieId
 * @property {string} movieTitle
 * @property {string} format - e.g. "IMAX 2D • English"
 * @property {string} startTime - ISO datetime
 * @property {string} theaterName
 * @property {number} theaterId
 */

/**
 * @typedef {'standard' | 'vip'} SeatType
 * @typedef {'available' | 'occupied' | 'held'} SeatStatus
 */

/**
 * @typedef {Object} SeatDto
 * @property {string} id - e.g. "F12"
 * @property {string} row
 * @property {number} col
 * @property {SeatType} type
 * @property {SeatStatus} status
 * @property {number} price
 */

/**
 * @typedef {Object} SeatMapResponse
 * @property {ShowDto} show
 * @property {SeatDto[]} seats
 * @property {Record<SeatType, number>} prices
 */

/**
 * @typedef {Object} HoldSeatsRequest
 * @property {number} showId
 * @property {string[]} seatIds
 */

/**
 * @typedef {Object} HoldSeatsResponse
 * @property {string} holdToken
 * @property {string} expiresAt - ISO datetime
 * @property {string[]} seatIds
 */

/**
 * @typedef {Object} CreateBookingRequest
 * @property {number} showId
 * @property {string[]} seatIds
 * @property {string} [holdToken]
 */

/**
 * @typedef {Object} BookingLineItem
 * @property {string} label
 * @property {number} amount
 */

/**
 * @typedef {Object} BookingSummaryDto
 * @property {number} id
 * @property {string} bookingCode
 * @property {ShowDto} show
 * @property {string[]} seatIds
 * @property {BookingLineItem[]} lineItems
 * @property {number} subtotal
 * @property {number} fees
 * @property {number} taxes
 * @property {number} total
 * @property {'PENDING' | 'CONFIRMED' | 'CANCELLED'} status
 */

/**
 * @typedef {Object} ContactDetails
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} phone
 */

/**
 * @typedef {'creditCard' | 'ewallet' | 'qrpay'} PaymentMethodId
 */

/**
 * @typedef {Object} CardDetails
 * @property {string} cardNumber
 * @property {string} expiry
 * @property {string} cvv
 */

/**
 * @typedef {Object} CheckoutRequest
 * @property {number} bookingId
 * @property {ContactDetails} contact
 * @property {PaymentMethodId} paymentMethod
 * @property {CardDetails} [card]
 * @property {string} [promoCode]
 */

/**
 * @typedef {Object} CheckoutResponse
 * @property {number} paymentId
 * @property {string} transactionRef
 * @property {BookingSummaryDto} booking
 * @property {'SUCCESS' | 'PENDING' | 'FAILED'} status
 */

/**
 * @typedef {Object} PaymentMethodDto
 * @property {PaymentMethodId} id
 * @property {string} title
 * @property {string} subtitle
 * @property {string} icon
 */

/**
 * @typedef {Object} TheaterDto
 * @property {number} id
 * @property {string} name
 * @property {string} [address]
 * @property {string} [phone]
 * @property {number} provinceId
 * @property {string} provinceName
 */

/**
 * @typedef {Object} ProvinceDto
 * @property {number} id
 * @property {string} name
 * @property {string} slug
 * @property {TheaterDto[]} theaters
 * @property {number} theaterCount
 */

export {};
