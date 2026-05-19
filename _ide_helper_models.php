<?php

// @formatter:off
// phpcs:ignoreFile
/**
 * A helper file for your Eloquent Models
 * Copy the phpDocs from this file to the correct Model,
 * And remove them from this file, to prevent double declarations.
 *
 * @author Barry vd. Heuvel <barryvdh@gmail.com>
 */


namespace App\Models{
/**
 * @property int $id
 * @property string $code
 * @property string|null $description
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Block newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Block newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Block query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Block whereCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Block whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Block whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Block whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Block whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Block whereUpdatedAt($value)
 */
	class Block extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $user_id
 * @property numeric $opening_amount
 * @property string $status
 * @property \Illuminate\Support\Carbon $opened_at
 * @property \Illuminate\Support\Carbon|null $closed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Expense> $expenses
 * @property-read int|null $expenses_count
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CashRegister newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CashRegister newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CashRegister query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CashRegister whereClosedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CashRegister whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CashRegister whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CashRegister whereOpenedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CashRegister whereOpeningAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CashRegister whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CashRegister whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CashRegister whereUserId($value)
 */
	class CashRegister extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $room_id
 * @property int $guest_id
 * @property int $user_id
 * @property \Illuminate\Support\Carbon $check_in_date
 * @property int $duration_days
 * @property \Illuminate\Support\Carbon|null $check_out_date
 * @property string|null $notes
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $reservation_id
 * @property int|null $schedule_id
 * @property \Illuminate\Support\Carbon|null $actual_arrival_date
 * @property string|null $origin
 * @property bool $is_temporary
 * @property int|null $parent_checkin_id
 * @property numeric $carried_balance
 * @property int|null $special_agreement_id
 * @property numeric|null $agreed_price
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Spatie\Activitylog\Models\Activity> $activities
 * @property-read int|null $activities_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\CheckinDetail> $checkinDetails
 * @property-read int|null $checkin_details_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Guest> $companions
 * @property-read int|null $companions_count
 * @property-read mixed $advance_payment
 * @property-read mixed $real_paid
 * @property-read \App\Models\Guest $guest
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Invoice> $invoices
 * @property-read int|null $invoices_count
 * @property-read Checkin|null $parentCheckin
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Payment> $payments
 * @property-read int|null $payments_count
 * @property-read \App\Models\Reservation|null $reservation
 * @property-read \App\Models\Room $room
 * @property-read \App\Models\Schedule|null $schedule
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Service> $services
 * @property-read int|null $services_count
 * @property-read \App\Models\SpecialAgreement|null $specialAgreement
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\RoomTransfer> $transfers
 * @property-read int|null $transfers_count
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereActualArrivalDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereAgreedPrice($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereCarriedBalance($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereCheckInDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereCheckOutDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereDurationDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereGuestId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereIsTemporary($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereOrigin($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereParentCheckinId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereReservationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereRoomId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereScheduleId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereSpecialAgreementId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Checkin whereUserId($value)
 */
	class Checkin extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $checkin_id
 * @property int $service_id
 * @property int $quantity
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property numeric|null $selling_price
 * @property string|null $consumed_at
 * @property-read \App\Models\Checkin $checkin
 * @property-read \App\Models\Service $service
 * @property-read mixed $total
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CheckinDetail newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CheckinDetail newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CheckinDetail query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CheckinDetail whereCheckinId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CheckinDetail whereConsumedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CheckinDetail whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CheckinDetail whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CheckinDetail whereQuantity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CheckinDetail whereSellingPrice($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CheckinDetail whereServiceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CheckinDetail whereUpdatedAt($value)
 */
	class CheckinDetail extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $cash_register_id
 * @property int $user_id
 * @property numeric $amount
 * @property string $description
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\CashRegister $cashRegister
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Expense newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Expense newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Expense query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Expense whereAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Expense whereCashRegisterId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Expense whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Expense whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Expense whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Expense whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Expense whereUserId($value)
 */
	class Expense extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property bool $is_active
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Floor newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Floor newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Floor query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Floor whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Floor whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Floor whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Floor whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Floor whereUpdatedAt($value)
 */
	class Floor extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $full_name
 * @property string|null $nationality
 * @property string|null $identification_number
 * @property string|null $issued_in
 * @property string|null $civil_status
 * @property string|null $profession
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $birth_date
 * @property string $profile_status
 * @property string|null $phone
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Checkin> $checkins
 * @property-read int|null $checkins_count
 * @property-read mixed $age
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Guest newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Guest newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Guest query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Guest whereBirthDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Guest whereCivilStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Guest whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Guest whereFullName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Guest whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Guest whereIdentificationNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Guest whereIssuedIn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Guest whereNationality($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Guest wherePhone($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Guest whereProfession($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Guest whereProfileStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Guest whereUpdatedAt($value)
 */
	class Guest extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $invoice_number
 * @property int $checkin_id
 * @property \Illuminate\Support\Carbon $issue_date
 * @property string $control_code
 * @property string $payment_method
 * @property int $user_id
 * @property \Illuminate\Support\Carbon $issue_time
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $customer_name
 * @property string|null $customer_nit
 * @property numeric $total_amount
 * @property numeric $additional_discount
 * @property numeric $total_subject_to_vat
 * @property string|null $cuf
 * @property int|null $payment_method_code
 * @property string|null $siat_reception_code
 * @property string $siat_status
 * @property int|null $significant_event_id
 * @property string|null $offline_xml_path
 * @property int|null $void_reason_code
 * @property \Illuminate\Support\Carbon|null $voided_at
 * @property int|null $voided_by_user_id
 * @property-read \App\Models\Checkin $checkin
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\InvoiceDetail> $details
 * @property-read int|null $details_count
 * @property-read \App\Models\SignificantEvent|null $significantEvent
 * @property-read \App\Models\User $user
 * @property-read \App\Models\User|null $voidedBy
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereAdditionalDiscount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereCheckinId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereControlCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereCuf($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereCustomerName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereCustomerNit($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereInvoiceNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereIssueDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereIssueTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereOfflineXmlPath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice wherePaymentMethod($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice wherePaymentMethodCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereSiatReceptionCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereSiatStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereSignificantEventId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereTotalAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereTotalSubjectToVat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereVoidReasonCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereVoidedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereVoidedByUserId($value)
 */
	class Invoice extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $invoice_id
 * @property int|null $service_id
 * @property int $quantity
 * @property numeric $unit_price
 * @property numeric $cost
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $description
 * @property-read \App\Models\Invoice $invoice
 * @property-read \App\Models\Service|null $service
 * @method static \Illuminate\Database\Eloquent\Builder<static>|InvoiceDetail newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|InvoiceDetail newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|InvoiceDetail query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|InvoiceDetail whereCost($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|InvoiceDetail whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|InvoiceDetail whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|InvoiceDetail whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|InvoiceDetail whereInvoiceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|InvoiceDetail whereQuantity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|InvoiceDetail whereServiceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|InvoiceDetail whereUnitPrice($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|InvoiceDetail whereUpdatedAt($value)
 */
	class InvoiceDetail extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $room_id
 * @property int $user_id
 * @property string $issue
 * @property string|null $description
 * @property string|null $photo_path
 * @property string|null $resolved_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Checkin|null $checkin
 * @property-read \App\Models\Room $room
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Maintenance newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Maintenance newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Maintenance query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Maintenance whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Maintenance whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Maintenance whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Maintenance whereIssue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Maintenance wherePhotoPath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Maintenance whereResolvedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Maintenance whereRoomId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Maintenance whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Maintenance whereUserId($value)
 */
	class Maintenance extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int|null $checkin_id
 * @property int $user_id
 * @property numeric $amount
 * @property string $method
 * @property string|null $bank_name
 * @property string $type
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $reservation_id
 * @property int|null $cash_register_id
 * @property \Illuminate\Support\Carbon|null $payment_date
 * @property string|null $voucher_path
 * @property string $status
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Spatie\Activitylog\Models\Activity> $activities
 * @property-read int|null $activities_count
 * @property-read \App\Models\CashRegister|null $cashRegister
 * @property-read \App\Models\Checkin|null $checkin
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereBankName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereCashRegisterId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereCheckinId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereMethod($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment wherePaymentDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereReservationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereVoucherPath($value)
 */
	class Payment extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $room_type_id
 * @property string $bathroom_type
 * @property numeric $amount
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\RoomType $roomType
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Room> $rooms
 * @property-read int|null $rooms_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Price active()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Price newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Price newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Price query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Price whereAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Price whereBathroomType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Price whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Price whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Price whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Price whereRoomTypeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Price whereUpdatedAt($value)
 */
	class Price extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $user_id
 * @property int $guest_id
 * @property int $guest_count
 * @property string $arrival_date
 * @property string $arrival_time
 * @property int $duration_days
 * @property string $payment_type
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $special_agreement_id
 * @property string|null $cancellation_date
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ReservationDetail> $details
 * @property-read int|null $details_count
 * @property-read mixed $advance_payment
 * @property-read mixed $is_expired
 * @property-read \App\Models\Guest $guest
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Payment> $payments
 * @property-read int|null $payments_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ReservationGuest> $reservationGuests
 * @property-read int|null $reservation_guests_count
 * @property-read \App\Models\SpecialAgreement|null $specialAgreement
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation whereArrivalDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation whereArrivalTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation whereCancellationDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation whereDurationDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation whereGuestCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation whereGuestId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation wherePaymentType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation whereSpecialAgreementId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reservation whereUserId($value)
 */
	class Reservation extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $reservation_id
 * @property int|null $room_id
 * @property \App\Models\Price|null $price
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $price_id
 * @property int|null $requested_room_type_id
 * @property string|null $requested_bathroom
 * @property-read \App\Models\RoomType|null $requestedRoomType
 * @property-read \App\Models\Reservation $reservation
 * @property-read \App\Models\Room|null $room
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationDetail newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationDetail newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationDetail query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationDetail whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationDetail whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationDetail wherePrice($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationDetail wherePriceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationDetail whereRequestedBathroom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationDetail whereRequestedRoomTypeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationDetail whereReservationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationDetail whereRoomId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationDetail whereUpdatedAt($value)
 */
	class ReservationDetail extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $reservation_id
 * @property int $guest_id
 * @property string $email
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Guest $guest
 * @property-read \App\Models\Reservation $reservation
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationGuest newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationGuest newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationGuest query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationGuest whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationGuest whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationGuest whereGuestId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationGuest whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationGuest whereReservationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReservationGuest whereUpdatedAt($value)
 */
	class ReservationGuest extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $number
 * @property int $block_id
 * @property int $floor_id
 * @property int $price_id
 * @property int $room_type_id
 * @property string $status
 * @property string|null $notes
 * @property string|null $image_path
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Block $block
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\CheckinDetail> $checkinDetails
 * @property-read int|null $checkin_details_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Checkin> $checkins
 * @property-read int|null $checkins_count
 * @property-read \App\Models\Floor $floor
 * @property-read string|null $image_url
 * @property-read \App\Models\Price $price
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Price> $prices
 * @property-read int|null $prices_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ReservationDetail> $reservationDetails
 * @property-read int|null $reservation_details_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Reservation> $reservations
 * @property-read int|null $reservations_count
 * @property-read \App\Models\RoomType $roomType
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereBlockId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereFloorId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereImagePath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room wherePriceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereRoomTypeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereUpdatedAt($value)
 */
	class Room extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $checkin_id
 * @property int $from_room_id
 * @property int $to_room_id
 * @property int $user_id
 * @property string $transfer_date
 * @property string $reason
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Checkin $checkin
 * @property-read \App\Models\Room $fromRoom
 * @property-read \App\Models\Room $toRoom
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomTransfer newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomTransfer newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomTransfer query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomTransfer whereCheckinId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomTransfer whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomTransfer whereFromRoomId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomTransfer whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomTransfer whereReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomTransfer whereToRoomId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomTransfer whereTransferDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomTransfer whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomTransfer whereUserId($value)
 */
	class RoomTransfer extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property int $capacity
 * @property string|null $description
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property bool $is_active
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Price> $prices
 * @property-read int|null $prices_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Room> $rooms
 * @property-read int|null $rooms_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomType newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomType newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomType query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomType whereCapacity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomType whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomType whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomType whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomType whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomType whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomType whereUpdatedAt($value)
 */
	class RoomType extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property string $check_in_time
 * @property string $check_out_time
 * @property int $entry_tolerance_minutes
 * @property int $exit_tolerance_minutes
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Checkin> $checkins
 * @property-read int|null $checkins_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Schedule newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Schedule newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Schedule query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Schedule whereCheckInTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Schedule whereCheckOutTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Schedule whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Schedule whereEntryToleranceMinutes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Schedule whereExitToleranceMinutes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Schedule whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Schedule whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Schedule whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Schedule whereUpdatedAt($value)
 */
	class Schedule extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property string $status
 * @property numeric $price
 * @property string|null $description
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int $quantity
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service wherePrice($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service whereQuantity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service whereUpdatedAt($value)
 */
	class Service extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $type
 * @property int $environment
 * @property int $branch_code
 * @property int $pos_code
 * @property string $code
 * @property string|null $control_code
 * @property \Illuminate\Support\Carbon $issued_at
 * @property \Illuminate\Support\Carbon $expires_at
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential active()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential whereBranchCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential whereCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential whereControlCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential whereEnvironment($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential whereExpiresAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential whereIssuedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential wherePosCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SiatCredential whereUpdatedAt($value)
 */
	class SiatCredential extends \Eloquent {}
}

namespace App\Models{
/**
 * SignificantEvent
 *
 * Representa un Evento Significativo (contingencia) según RND-102100000011.
 * Permite operar offline temporalmente y luego notificar al SIAT.
 *
 * @property int $id
 * @property int $event_code
 * @property string $description
 * @property \Illuminate\Support\Carbon $start_at
 * @property \Illuminate\Support\Carbon|null $end_at
 * @property string $cufd_event
 * @property string $cufd_event_control_code
 * @property string|null $siat_reception_code
 * @property string $status
 * @property int $user_id
 * @property \Illuminate\Support\Carbon|null $registered_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read string $code_label
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Invoice> $invoices
 * @property-read int|null $invoices_count
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent whereCufdEvent($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent whereCufdEventControlCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent whereEndAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent whereEventCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent whereRegisteredAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent whereSiatReceptionCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent whereStartAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SignificantEvent whereUserId($value)
 */
	class SignificantEvent extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property numeric $agreed_price
 * @property int $payment_frequency_days
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string $type
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Checkin> $checkins
 * @property-read int|null $checkins_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Reservation> $reservations
 * @property-read int|null $reservations_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SpecialAgreement newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SpecialAgreement newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SpecialAgreement query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SpecialAgreement whereAgreedPrice($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SpecialAgreement whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SpecialAgreement whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SpecialAgreement wherePaymentFrequencyDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SpecialAgreement whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SpecialAgreement whereUpdatedAt($value)
 */
	class SpecialAgreement extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $nickname
 * @property string $full_name
 * @property string $phone
 * @property string $address
 * @property string $password
 * @property bool $is_active
 * @property string|null $remember_token
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $shift
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Spatie\Activitylog\Models\Activity> $activities
 * @property-read int|null $activities_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\CashRegister> $cashRegisters
 * @property-read int|null $cash_registers_count
 * @property-read mixed $email
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Expense> $expenses
 * @property-read int|null $expenses_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Invoice> $invoices
 * @property-read int|null $invoices_count
 * @property-read mixed $name
 * @property-read \Illuminate\Notifications\DatabaseNotificationCollection<int, \Illuminate\Notifications\DatabaseNotification> $notifications
 * @property-read int|null $notifications_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Spatie\Permission\Models\Permission> $permissions
 * @property-read int|null $permissions_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Reservation> $reservations
 * @property-read int|null $reservations_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Spatie\Permission\Models\Role> $roles
 * @property-read int|null $roles_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Laravel\Sanctum\PersonalAccessToken> $tokens
 * @property-read int|null $tokens_count
 * @method static \Database\Factories\UserFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User permission($permissions, $without = false)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User role($roles, $guard = null, $without = false)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereAddress($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereFullName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereNickname($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePhone($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRememberToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereShift($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User withoutPermission($permissions)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User withoutRole($roles, $guard = null)
 */
	class User extends \Eloquent {}
}

