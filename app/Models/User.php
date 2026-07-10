<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Spatie\Permission\Traits\HasRoles;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasRoles, LogsActivity;


    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'nickname',
        'full_name',
        'phone',
        'address',
        'shift',
        'password',
        'is_active',
        'must_change_password',
        'password_changed_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected $appends = ['name', 'email'];

    protected function name(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->full_name ?? $this->nickname ?? 'Usuario',
        );
    }

    protected function email(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->nickname, // Retornamos el nickname donde pida email
        );
    }

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'password_changed_at' => 'datetime',
        ];
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function cashRegisters()
    {
        return $this->hasMany(CashRegister::class);
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }

    /**
     * Usuarios activos disponibles para ser seleccionados como "operador"
     * en el selector de la sesión global de recepción (Check-in, Pagos,
     * Gastos, Checkout...). Excluye cuentas de sistema que no son personas
     * físicas reales: 'recepcion' (Terminal Compartida / Kiosk Mode) y
     * 'sistema_web' (reservas automáticas desde la web).
     */
    public function scopeOperadores($query)
    {
        return $query->where('is_active', true)
            ->whereNotIn('nickname', ['recepcion', 'sistema_web']);
    }

    /*Configuraxion de la bitacora de actividades*/
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'nickname',
                'full_name',
                'phone',
                'address',
                'shift',
                'is_active',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('usuarios');
    }
}
