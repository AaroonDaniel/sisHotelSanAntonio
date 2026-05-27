<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PaymentHistoryController extends Controller
{
    public function index(Request $request)
    {
        $payments = Payment::with(['user', 'checkin.room', 'checkin.guests'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return Inertia::render('payments/history', [
            'payments' => $payments
        ]);
    }
}
