<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {

        $request->validate([
            'nickname' => 'required|string',
            'password' => 'required',
            'device_name' => 'required',
        ]);

        $user = User::where('nickname', $request->nickname)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'nickname' => ['Las credenciales son incorrectas o el usuario no existe.'],
            ]);
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'nickname' => ['El usuario está desactivado.'],
            ]);
        }

        $token = $user->createToken($request->device_name)->plainTextToken;

        return response()->json([
            'message' => 'Bienvenido al sistema hotelero',
            'token' => $token,
            'user' => $user,
        ]);
    }
    public function logout(Request $request)
    {
        // El signo de interrogación (?) evita el error si no hay token (ej. si entraste por cookie)
        $request->user()->currentAccessToken()?->delete();
        
        return response()->json(['message' => 'Sesión cerrada correctamente']);
    }
}
