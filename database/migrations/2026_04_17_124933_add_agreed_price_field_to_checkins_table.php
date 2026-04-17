<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('checkins', function (Blueprint $table) {
            // Verificamos si no existe ya (por seguridad) y la creamos
            if (!Schema::hasColumn('checkins', 'agreed_price')) {
                $table->decimal('agreed_price', 10, 2)->nullable()->after('advance_payment');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checkins', function (Blueprint $table) {
            if (Schema::hasColumn('checkins', 'agreed_price')) {
                $table->dropColumn('agreed_price');
            }
        });
    }
};