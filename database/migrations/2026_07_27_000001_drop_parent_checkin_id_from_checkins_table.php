<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('checkins', 'parent_checkin_id')) {
            Schema::table('checkins', function (Blueprint $table) {
                $table->dropForeign(['parent_checkin_id']);
                $table->dropColumn('parent_checkin_id');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('checkins', 'parent_checkin_id')) {
            Schema::table('checkins', function (Blueprint $table) {
                $table->foreignId('parent_checkin_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('checkins')
                    ->nullOnDelete();
            });
        }
    }
};
