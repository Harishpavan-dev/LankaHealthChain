import { IsArray, ArrayMinSize, ArrayMaxSize, ArrayUnique, IsIn, IsInt, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateAccessRequestDto {
 @ApiProperty() @IsUUID() patientId!: string;
 @ApiProperty({ enum:['treatment','follow-up'] }) @IsIn(['treatment','follow-up']) purpose!: string;
 @ApiProperty({ type:[String] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5) @ArrayUnique()
 @IsIn(['Observation','DiagnosticReport','MedicationRequest','AllergyIntolerance','Condition'], {each:true})
 requestedTypes!: string[];
 @ApiProperty({ minimum:1, maximum:1440 }) @IsInt() @Min(1) @Max(1440) requestedDurationMinutes!: number;
}
