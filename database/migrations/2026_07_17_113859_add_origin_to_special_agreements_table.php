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
        Schema::table('special_agreements', function (Blueprint $table) {
            $table->string('origin')->nullable()->after('company_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('special_agreements', function (Blueprint $table) {
            $table->dropColumn('origin');
        });
    }
};
