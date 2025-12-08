from django.db import models
from django.utils import timezone
from PropertyServices.models import Property
import math

class Settings(models.Model):
    id=models.AutoField(primary_key=True)
    commission_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    commission_type = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
class Apartment(models.Model):
    APARTMENT_TYPES = (
        ('king', 'King'),
        ('luxury', 'Luxury'),
        ('normal', 'Normal'),
        ('economic', 'Economic'),
    )
    number = models.IntegerField(blank=True, null=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    property_assigned = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name='apartments', blank=True, null=True
    )
    capacity = models.SmallIntegerField(blank=True, null=True)
    numberOfBeds = models.SmallIntegerField(blank=True, null=True)
    apartmentType = models.CharField(max_length=20, choices=APARTMENT_TYPES)
    inService = models.BooleanField(default=False)
    cleaned = models.BooleanField(default=True)
    price = models.FloatField(blank=True, null=True)
    currency=models.CharField(max_length=50,blank=True,null=True,default='€',choices=(('XAF','XAF'), ('$','$'),('INR','INR'),('€','€'),('GBP','GBP'),('AUD','AUD'),('CAD','CAD'),('JPY','JPY'),('CNY','CNY'),('RUB','RUB'),('BRL','BRL'),('ZAR','ZAR'),('NGN','NGN'),('MXN','MXN'),('ARS','ARS'),('CHF','CHF'),('SEK','SEK'),('NOK','NOK'),('DKK','DKK'),('PLN','PLN'),('CZK','CZK'),('TRY','TRY'),('UAH','UAH'),('HUF','HUF'),('RON','RON'),('BGN','BGN'),('HRK','HRK'),('SLO','SLO'),('SK','SK'),('LT','LT'),('LV','LV'),('EE','EE'),('IE','IE'),('SC','SC'),('WL','WL'),('NI','NI'),('NZ','NZ'),('SGD','SGD'),('MYR','MYR'),('THB','THB'),('IDR','IDR'),('PHP','PHP'),('VND','VND'),('KRW','KRW'),('KPW','KPW'),('TWD','TWD'),('HKD','HKD'),('MOP','MOP'),('BDT','BDT'),('PKR','PKR'),('LKR','LKR'),('NPR','NPR'),('BTN','BTN'),('MVR','MVR'),('AFN','AFN'),('IRR','IRR'),('IQD','IQD'),('SYP','SYP'),('LBN','LBN')))
    image = models.JSONField(blank=True, null=True)
    added_by_user_id=models.ForeignKey('UserServices.User',on_delete=models.CASCADE,blank=True,null=True,related_name='added_by_user_id_apartment')
    is_active = models.BooleanField(default=True)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)

    def __str__(self):
        return str(self.number)


class Booking(models.Model):
    STATUS_TYPES = (
        ('confirmed', 'Confirmed'),
        ('checked_in', 'Checked In'),
        ('checked_out', 'Checked Out'),
        ('cancelled', 'Cancelled'),
        ('upcoming', 'Upcoming'),
        ('active', 'Active')
    )
    PAYMENT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('partially_paid', 'Partially Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )

    PAYMENT_METHOD_CHOICES = (
        ('credit_card', 'Credit Card'),
        ('paypal', 'PayPal'),
        ('bank_transfer', 'Bank Transfer'),
        ('cash', 'Cash'),
        ('other', 'Other'),
    )
    apartments = models.ManyToManyField(Apartment, blank=True, related_name='apartments_booking')
    guest = models.ForeignKey('UserServices.Guest', null=True, on_delete=models.CASCADE)
    dateOfReservation = models.DateTimeField(default=timezone.now)
    added_by_user_id = models.ForeignKey('UserServices.User', on_delete=models.SET_NULL, blank=True, null=True, related_name='added_by_user_id_booking')
    check_in_by_user_id = models.ForeignKey('UserServices.User', on_delete=models.SET_NULL, blank=True, null=True, related_name='check_in_by_user_id_booking')
    check_out_by_user_id = models.ForeignKey('UserServices.User', on_delete=models.SET_NULL, blank=True, null=True, related_name='check_out_by_user_id_booking')
    status = models.CharField(max_length=50, choices=STATUS_TYPES, default='upcoming')
    
    persons = models.IntegerField(default=1)
    adults = models.IntegerField(default=0)
    children = models.IntegerField(default=0)
    
    settings = models.ForeignKey(Settings, null=True, on_delete=models.CASCADE)
    payment_status = models.CharField(max_length=50, choices=PAYMENT_STATUS_CHOICES,  blank=True, null=True)
    payment_method = models.CharField(max_length=255, choices=PAYMENT_METHOD_CHOICES, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    booker_country = models.CharField(max_length=255, blank=True, null=True)
    travel_purpose = models.CharField(max_length=255, blank=True, null=True)
    
    startDate = models.DateTimeField()
    endDate = models.DateTimeField()
    updated_at = models.DateTimeField(auto_now=True)

    def numOfDep(self):
        return Dependees.objects.filter(booking=self).count()

    def __str__(self):
        # Handle ManyToMany field - get first apartment or show count
        apartments = self.apartments.all()
        if apartments.exists():
            first_apartment = apartments.first()
            return f"{first_apartment.number} - {first_apartment.name} {self.guest}"
        return f"No apartments - {self.guest}"
    
    def commission_amount(self):
        """Calculate commission amount based on total booking price and duration"""
        try:
            total_price = 0
            
            # Calculate total price considering duration
            for apartment in self.apartments.all():
                if apartment and apartment.price:
                    total_hours = (self.endDate - self.startDate).total_seconds() / 3600
                    duration_days = math.ceil(total_hours / 24)
                    total_price += duration_days * float(apartment.price)
            
            if total_price > 0 and self.settings and self.settings.commission_percentage:
                commission = (total_price * float(self.settings.commission_percentage)) / 100
                return round(commission, 2)
            return 0.00
            
        except (AttributeError, TypeError, ValueError) as e:
            print(f"Error in model commission calculation: {e}")
            return 0.00
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        # Update apartment statuses after saving
        if self.apartments.exists():
            for apartment in self.apartments.all():
                if self.status == 'checked_in':
                    apartment.inService = True
                else:
                    apartment.inService = False
                apartment.save(update_fields=['inService'])

class Dependees(models.Model):
    booking = models.ForeignKey(Booking, null=True, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)

    def str(self):
        return str(self.booking) + " " + str(self.name)


class Refund(models.Model):
    guest = models.ForeignKey('UserServices.Guest', null=True, on_delete=models.CASCADE)
    reservation = models.ForeignKey(Booking, on_delete=models.CASCADE)
    amount =  models.FloatField(blank=True, null=True)
    reason = models.TextField()
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, choices=(
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ), default='pending')
    processed_by = models.ForeignKey('UserServices.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='refund_processed_by')
    updated_by = models.ForeignKey('UserServices.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='refund_updated_by')

    def __str__(self):
        return str(self.guest)


class RoomServices(models.Model):
    SERVICES_TYPES = (
        ('cleaning', 'Cleaning'),
        ('technical', 'Technical'),
    )

    curBooking = models.ForeignKey(
        Booking,   null=True, on_delete=models.CASCADE)
    apartment = models.ForeignKey(Apartment, on_delete=models.CASCADE)
    createdDate = models.DateField(default=timezone.now)
    servicesType = models.CharField(max_length=20, choices=SERVICES_TYPES)
    price = models.FloatField()

    def str(self):
        return str(self.curBooking) + " " + str(self.apartment) + " " + str(self.servicesType)
