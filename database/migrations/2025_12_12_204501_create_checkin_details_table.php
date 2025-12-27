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
        Schema::create('checkin_details', function (Blueprint $table) {
            $table->id(); 
            $table->foreignId('checkin_id')->constrained()->onDelete('cascade');//id del check-in
            $table->foreignId('service_id')->constrained()->onDelete('restrict');//id del servicio
            $table->integer('quantity')->default(1);//cantidad del servicio
            $table->decimal('selling_price', 10, 2);//precio de venta del servicio
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('checkin_details');
    }
};