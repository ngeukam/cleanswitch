import math
from rest_framework import serializers
from cleanswitch.Helpers import createParsedCreatedAtUpdatedAt
from UserServices.models import Guest, User
from PropertyServices.Serializers import PropertySimpleSerializer
from .models import Apartment, Booking, Refund, Settings
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from django.db.models import Q


@createParsedCreatedAtUpdatedAt
class ApartmentSerializer(serializers.ModelSerializer):
    added_by_user_id = serializers.SerializerMethodField()
    property_assigned_name = serializers.SerializerMethodField()
    property_address = serializers.SerializerMethodField()
    class Meta:
        model = Apartment
        fields = '__all__'
        
    def get_added_by_user_id(self, obj):
        if obj.added_by_user_id:
            return obj.added_by_user_id.username
        return None
        
    def get_property_assigned_name(self, obj):
        return obj.property_assigned.name if obj.property_assigned else None
    
    def get_property_address(self, obj):
        return obj.property_assigned.address if obj.property_assigned else None

    def validate(self, data):
        instance = self.instance  # This is None during creation, existing instance during update
        
        # Required fields validation for create operation
        if instance is None:
            required_fields = [
                'name', 'property_assigned', 'apartmentType',
                'capacity', 'numberOfBeds', 'price', 'currency'
            ]
            
            missing_fields = []
            for field in required_fields:
                if field not in data or data[field] is None:
                    missing_fields.append(field)
            
            if missing_fields:
                raise serializers.ValidationError({
                    'message': f'The following fields are required: {", ".join(missing_fields)}'
                })
            
            # Validate numeric fields for positive values
            if data.get('capacity', 0) <= 0:
                raise serializers.ValidationError({
                    'message': 'Capacity must be greater than 0'
                })
            
            if data.get('numberOfBeds', 0) <= 0:
                raise serializers.ValidationError({
                    'message': 'Number of beds must be greater than 0'
                })
            
            if data.get('price', 0) <= 0:
                raise serializers.ValidationError({
                    'message': 'Price must be greater than 0'
                })

        # Existing duplicate validation logic
        number = data.get('number')
        property_assigned = data.get('property_assigned')
        if number is None or property_assigned is None:
            # Skip duplicate validation if number isn't being changed
            if instance and number == instance.number and property_assigned == instance.property_assigned:
                return data
                
            # Check for duplicate apartment number in the same property
            qs = Apartment.objects.filter(
                number=number,
                property_assigned=property_assigned
            )
            
            # If updating, exclude current instance from the check
            if instance:
                qs = qs.exclude(pk=instance.pk)
                
            if qs.exists():
                raise serializers.ValidationError({
                    'message': 'This apartment number already exists for the selected property'
                })
        
        return data

    def create(self, validated_data):
        # The create validation is now handled in the validate method
        return super().create(validated_data)
    
class ApartmentSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Apartment
        fields = ['id', 'number', 'name', 'inService', 'cleaned', 'apartmentType', 'price', 'currency']

class UserSerializer(serializers.ModelSerializer):
    properties_assigned = PropertySimpleSerializer(many=True, read_only=True)
    fullName = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'fullName', 'email', 'role', 'phone', 'properties_assigned', 'password', 'department', 'is_active', 'created_at']
        read_only_fields = ['id', 'role']
    def get_fullName(self, obj):
        return obj.get_full_name()
     
class GuestSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    current_apartment = serializers.SerializerMethodField()
    booking_count = serializers.SerializerMethodField()

    class Meta:
        model = Guest
        fields = ['id', 'user', 'current_apartment', 'booking_count', 'idCard']
        read_only_fields = fields

    def get_current_apartment(self, obj):
        return obj.current_apartment()

    def get_booking_count(self, obj):
        return obj.num_of_bookings()

class BookingUpdateSerializer(serializers.ModelSerializer):
    apartments = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Apartment.objects.all(), 
        required=False
    )
    settings = serializers.PrimaryKeyRelatedField(
        queryset=Settings.objects.all(), 
        required=False,
        allow_null=True
    )
    
    # Guest fields (make them optional for updates)
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(write_only=True, required=False)
    phone = serializers.CharField(write_only=True, required=False)
    idCard = serializers.JSONField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Booking
        fields = [
            "apartments", "startDate", "endDate", "status",
            "first_name", "last_name", "phone", "email", "idCard", 
            'persons', 'adults', 'payment_status', 'payment_method',
            'settings', 'children', 'remarks', 'booker_country', 
            'travel_purpose',
        ]
    
    def validate_idCard(self, value):
        if not value:
            return None
        if not isinstance(value, dict):
            raise serializers.ValidationError("idCard must be a JSON object.")
        url = value.get("url")
        if not url:
            raise serializers.ValidationError("idCard must contain a 'url' key.")
        if not url.startswith("https://") or "s3" not in url:
            raise serializers.ValidationError("Invalid S3 URL for idCard.")
        return value
    
    def validate(self, attrs):
        start_date = attrs.get("startDate")
        end_date = attrs.get("endDate")
        apartments = attrs.get("apartments", [])
        persons = attrs.get("persons")
        adults = attrs.get("adults")
        children = attrs.get("children")
        
        # Validate dates
        if start_date and end_date:
            if start_date >= end_date:
                raise serializers.ValidationError("End date must be after start date.")
            
            # Check for overlapping bookings for each apartment
            for apartment in apartments:
                overlapping_bookings = Booking.objects.filter(
                    apartments=apartment,
                    startDate__lt=end_date,
                    endDate__gt=start_date
                ).exclude(status__in=['cancelled', 'checked_out'])
                
                if self.instance:
                    overlapping_bookings = overlapping_bookings.exclude(pk=self.instance.pk)
                
                if overlapping_bookings.exists():
                    raise serializers.ValidationError(
                        f"Apartment #{apartment.number} is already booked from {start_date} to {end_date}."
                    )
        if persons is not None and persons < 1:
            raise serializers.ValidationError("At least 1 person is required.")
    
        if adults is not None and adults < 0:
            raise serializers.ValidationError("Adults cannot be negative.")
        
        if children is not None and children < 0:
            raise serializers.ValidationError("Children cannot be negative.")
        
        if adults is not None and children is not None and persons is not None:
            if adults + children != persons:
                raise serializers.ValidationError("Total persons must equal adults + children.")
        return attrs
    
    def update(self, instance, validated_data):
        request = self.context.get("request")
        
        # Track who checked out the booking
        if request and hasattr(request, "user"):
            new_status = validated_data.get("status")
            current_status = instance.status
            
            if new_status == "checked_out" and current_status != "checked_out":
                validated_data["check_out_by_user_id"] = request.user
            elif new_status != "checked_out" and current_status == "checked_out":
                validated_data["check_out_by_user_id"] = None
        
        # Handle apartments ManyToMany field
        apartments = validated_data.pop('apartments', None)
        
        # Update booking fields
        instance.startDate = validated_data.get('startDate', instance.startDate)
        instance.endDate = validated_data.get('endDate', instance.endDate)
        instance.status = validated_data.get('status', instance.status)
        instance.check_out_by_user_id = validated_data.get('check_out_by_user_id', instance.check_out_by_user_id)
        instance.persons = validated_data.get('persons', instance.persons)
        instance.adults = validated_data.get('adults', instance.adults)
        instance.children = validated_data.get('children', instance.children)
        instance.settings = validated_data.get('settings', instance.settings)
        instance.payment_status = validated_data.get('payment_status', instance.payment_status)
        instance.payment_method = validated_data.get('payment_method', instance.payment_method)
        instance.remarks = validated_data.get('remarks', instance.remarks)
        instance.booker_country = validated_data.get('booker_country', instance.booker_country)
        instance.travel_purpose = validated_data.get('travel_purpose', instance.travel_purpose)
        # Update apartments if provided
        if apartments is not None:
            instance.apartments.set(apartments)
        
        # Handle guest data updates
        guest_data_provided = any(key in validated_data for key in ['first_name', 'last_name', 'phone', 'email', 'idCard'])
        
        if guest_data_provided:
            guest = instance.guest
            user = guest.user
            
            # Update user fields if provided
            if 'first_name' in validated_data:
                user.first_name = validated_data['first_name']
            if 'last_name' in validated_data:
                user.last_name = validated_data['last_name']
            if 'phone' in validated_data:
                user.phone = validated_data['phone']
            if 'email' in validated_data:
                user.email = validated_data['email']
            
            user.save()
            
            # Update guest ID card if provided
            if 'idCard' in validated_data:
                guest.idCard = validated_data['idCard']
                guest.save()
        
        instance.save()
        return instance

class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settings
        fields = '__all__'
        
class BookingListSerializer(serializers.ModelSerializer):
    apartments = ApartmentSerializer(many=True, read_only=True)
    guest = GuestSerializer(read_only=True)
    settings = SettingsSerializer(read_only=True)
    added_by_user = UserSerializer(source='added_by_user_id', read_only=True)
    duration = serializers.SerializerMethodField()
    totalPrice = serializers.SerializerMethodField()
    commission_amount = serializers.SerializerMethodField()
    class Meta:
        model = Booking
        fields = [
            'id', 'apartments', 'guest', 'dateOfReservation',
            'startDate', 'endDate', 'duration', 'added_by_user',
            'status', 'persons', 'adults', 'payment_status',
            'payment_method', 'settings','children', 'remarks',
            'booker_country', 'travel_purpose', 'commission_amount',
            'totalPrice', 'updated_at'
        ]
        read_only_fields = fields

    def get_duration(self, obj):
        try:
            total_hours = (obj.endDate - obj.startDate).total_seconds() / 3600
            duration_days = math.ceil(total_hours / 24)
            return duration_days
        except (AttributeError, TypeError):
            return None
     
    def get_totalPrice(self, obj):
        try:
            # Calculate total price for all apartments
            total_price = 0
            for apartment in obj.apartments.all():
                if apartment and apartment.price:
                    total_hours = (obj.endDate - obj.startDate).total_seconds() / 3600
                    duration_days = math.ceil(total_hours / 24)
                    total_price += duration_days * apartment.price
            return round(total_price, 2) if total_price > 0 else None
        except (AttributeError, TypeError):
            return None
    
    def get_commission_amount(self, obj):
        """Calculate commission amount based on settings and total price"""
        try:
            # Use the model's commission_amount method
            return obj.commission_amount()
        except (AttributeError, TypeError, ValueError):
            return None

class BookingCreateSerializer(serializers.ModelSerializer):
    apartments = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Apartment.objects.all(), 
        required=True
    )
    
    # Guest fields
    first_name = serializers.CharField(write_only=True, required=True)
    last_name = serializers.CharField(write_only=True, required=True)
    email = serializers.EmailField(write_only=True, required=True)
    phone = serializers.CharField(write_only=True, required=True)
    idCard = serializers.JSONField(write_only=True, required=False, allow_null=True)

    # Read-only fields for calculated values
    commission_amount = serializers.SerializerMethodField(read_only=True)
    total_price = serializers.SerializerMethodField(read_only=True)
    duration = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Booking
        fields = [
            "apartments", "startDate", "endDate", "status",
            "first_name", "last_name", "phone", "email", "idCard",
            'persons', 'adults', 'payment_status', 'payment_method',
            'settings', 'children', 'remarks', 'booker_country',
            'travel_purpose', 'commission_amount', 'total_price', 'duration'
        ]
    
    def validate_idCard(self, value):
        if not value:
            return None
        if not isinstance(value, dict):
            raise serializers.ValidationError("idCard must be a JSON object.")
        url = value.get("url")
        if not url:
            raise serializers.ValidationError("idCard must contain a 'url' key.")
        if not url.startswith("https://") or "s3" not in url:
            raise serializers.ValidationError("Invalid S3 URL for idCard.")
        return value
    
    def validate(self, attrs):
        start_date = attrs.get("startDate")
        end_date = attrs.get("endDate")
        apartments = attrs.get("apartments", [])
        persons = attrs.get("persons", 1)
        adults = attrs.get("adults", 1)
        children = attrs.get("children", 0)
        
        # Validate dates
        if start_date and end_date:
            if start_date >= end_date:
                raise serializers.ValidationError("End date must be after start date.")
            
            # Check for overlapping bookings for each apartment
            for apartment in apartments:
                overlapping_bookings = Booking.objects.filter(
                    apartments=apartment,
                    startDate__lt=end_date,
                    endDate__gt=start_date
                ).exclude(status__in=['cancelled', 'checked_out'])
                
                if overlapping_bookings.exists():
                    raise serializers.ValidationError(
                        f"Apartment #{apartment.number} is already booked from {start_date} to {end_date}."
                    )

        # Validate occupancy fields
        if persons < 1:
            raise serializers.ValidationError("At least 1 person is required.")
        
        if adults < 1:
            raise serializers.ValidationError("At least 1 adult is required.")
        
        if children < 0:
            raise serializers.ValidationError("Children cannot be negative.")
        
        if adults + children != persons:
            raise serializers.ValidationError("Total persons must equal adults + children.")

        return attrs

    def get_duration(self, obj):
        """Calculate booking duration in days"""
        try:
            total_hours = (obj.endDate - obj.startDate).total_seconds() / 3600
            duration_days = math.ceil(total_hours / 24)
            return duration_days
        except (AttributeError, TypeError):
            return None

    def get_total_price(self, obj):
        """Calculate total price for all apartments"""
        try:
            total_price = 0
            for apartment in obj.apartments.all():
                if apartment and apartment.price:
                    total_hours = (obj.endDate - obj.startDate).total_seconds() / 3600
                    duration_days = math.ceil(total_hours / 24)
                    total_price += duration_days * apartment.price
            return round(total_price, 2) if total_price > 0 else None
        except (AttributeError, TypeError):
            return None

    def get_commission_amount(self, obj):
        """Calculate commission amount based on settings and total price"""
        try:
            # Use the model's commission_amount method
            return obj.commission_amount()
        except (AttributeError, TypeError, ValueError):
            return None

    def create(self, validated_data):
        request = self.context.get("request")
        
        # Extract guest data
        guest_data = {
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name'),
            'phone': validated_data.pop('phone'),
            'email': validated_data.pop('email'),
        }
        id_card = validated_data.pop('idCard', None)
        
        # Extract apartments
        apartments = validated_data.pop('apartments')
        
        # Create or get guest
        guest, created = self._get_or_create_guest(guest_data, id_card)
        
        # Create booking
        booking = Booking.objects.create(
            guest=guest,
            **validated_data
        )
        
        # Add apartments to booking
        booking.apartments.set(apartments)
        
        # Set added_by_user if request has user
        if request and hasattr(request, "user"):
            booking.added_by_user_id = request.user
            booking.save()
        
        return booking

    def _get_or_create_guest(self, guest_data, id_card):
        """Get existing guest by email or create new one"""
        try:
            # Try to find existing guest by email
            user = User.objects.get(email=guest_data['email'])
            guest = Guest.objects.get(user=user)
            
            # Update guest information if found
            user.first_name = guest_data['first_name']
            user.last_name = guest_data['last_name']
            user.phone = guest_data['phone']
            user.save()
            
            # Update ID card if provided
            if id_card:
                guest.idCard = id_card
                guest.save()
                
            return guest, False
            
        except (User.DoesNotExist, Guest.DoesNotExist):
            # Create new user and guest
            user = User.objects.create(
                username=guest_data['email'],  # Use email as username
                **guest_data
            )
            
            guest = Guest.objects.create(
                user=user,
                idCard=id_card
            )
            
            return guest, True

    def to_representation(self, instance):
        """Override to include calculated fields in response"""
        representation = super().to_representation(instance)
        
        # Add calculated fields to response
        representation['duration'] = self.get_duration(instance)
        representation['total_price'] = self.get_total_price(instance)
        representation['commission_amount'] = self.get_commission_amount(instance)
        
        return representation
    
class RefundSerializer(serializers.ModelSerializer):
    guest = GuestSerializer(read_only=True)
    reservation = BookingListSerializer(read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.get_full_name', read_only=True)
    
    class Meta:
        model = Refund
        fields = [
            'id', 'guest', 'reservation',
            'amount', 'reason', 'status', 'processed_at', 'created_at', 'updated_at',
            'processed_by', 'processed_by_name', 'updated_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'processed_at']
    
    def validate_amount(self, value):
        if value and value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value
    
    def validate(self, data):
        # Prevent editing processed refunds
        instance = self.instance
        if instance and instance.status not in ['pending']:
            raise serializers.ValidationError("Cannot edit a processed refund.")
        return data

class BookingCalendarSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()
    start = serializers.SerializerMethodField()
    end = serializers.SerializerMethodField()
    color = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()
    apartments_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = [
            'id', 'title', 'start', 'end', 'color', 'type',
            'status', 'apartments_info'
        ]
    
    def get_title(self, obj):
        apartments_count = obj.apartments.count()
        apartment_info = f"{apartments_count} apartment{'s' if apartments_count != 1 else ''}"
        return f"Booking: {obj.guest.user.first_name} {obj.guest.user.last_name} ({apartment_info})"
    
    def get_start(self, obj):
        return obj.startDate.isoformat()
    
    def get_end(self, obj):
        return obj.endDate.isoformat()
    
    def get_color(self, obj):
        status_colors = {
            'confirmed': '#2196f3',      # Blue
            'checked_in': '#4caf50',     # Green
            'checked_out': '#f44336',    # Red
            'cancelled': '#9e9e9e',      # Grey
            'upcoming': '#ff9800',       # Orange
            'active': '#673ab7',         # Purple
        }
        return status_colors.get(obj.status, '#757575')
    
    def get_type(self, obj):
        return 'booking'
    
    def get_apartments_info(self, obj):
        return [{
            'id': apt.id,
            'number': apt.number,
            'name': apt.name,
            'property': apt.property_assigned.name if apt.property_assigned else None
        } for apt in obj.apartments.all()]
