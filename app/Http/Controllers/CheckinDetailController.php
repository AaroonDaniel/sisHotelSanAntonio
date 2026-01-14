<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\Checkin;
use App\Models\CheckinDetail;
use App\Models\Room; // <--- 1. IMPORTAMOS ROOM COMO PEDISTE
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Redirect;

class CheckinDetailController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
       
           
    }

    public function create()
    {
       
    }

    public function store(Request $request)
    {
        

        
    }

    public function update(Request $request, $id)
    {
        
    }

    public function destroy($id)
    {
       
    }
}