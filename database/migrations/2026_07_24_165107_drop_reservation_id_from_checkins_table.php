<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('checkins', 'reservation_id')) {
            Schema::table('checkins', function (Blueprint $table) {
                $table->dropForeign(['reservation_id']);
                $table->dropColumn('reservation_id');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('checkins', 'reservation_id')) {
            Schema::table('checkins', function (Blueprint $table) {
                $table->foreignId('reservation_id')
                    ->nullable()
                    ->after('user_id')
                    ->constrained('reservations')
                    ->onDelete('set null');
            });
        }
    }
};
